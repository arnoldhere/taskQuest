const express = require("express");
const router = express.Router();
const Project = require("../models/Project")
const authMiddleware = require("../middlewares/auth");
const Team = require("../models/Team");
const User = require("../models/User");
const nodemailer = require('nodemailer');


router.get("/fetch-projects/:email", async (req, res) => {

    const email = req.params.email;
    // console.log(email);
    const projects = await Project.find({ leader: email }); // Assuming 'leaderEmail' is the field name in your Project schema.
    const projects_count = await Project.countDocuments().where({ leader: email });
    res.status(201).json({ message: 'Projects fetched successfully !!', projects: projects, projects_count: projects_count });
})

router.post("/add-teamname", async (req, res) => {
    const { email, teamName } = req.body;
    console.log(email, teamName);

    const member = await User.findOne({ email: email });

    try {
        const team = new Team({
            leader: email,
            name: teamName,
            members: [{ user: member._id }]
        })
        await team.save();

        return res.status(201).json({ message: 'Team created successfully!!' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to create team. Please try again' });
    }
})

router.get("/fetch-teams", async (req, res) => {

    const teams = await Team.find();
    return res.status(201).json({ teams: teams });
});

router.get("/fetch-project-detail/:id", async (req, res) => {
    const id = req.params.id;
    console.log("project id : " + id);

    try {

        const project = await Project.findById(id);
        console.log(project);

        return res.status(201).json({ message: 'Project fetched successfully!!', project: project });

    } catch (error) {
        console.error("Failed to fetch project detail >> " + error);
        return res.status(500).json({ message: 'Internal server error' });
    }

});

router.get("/fetch-team-detail/:id", async (req, res) => {
    const id = req.params.id;

    try {
        // Find the team and populate member details
        const team = await Team.findById(id).populate("members.user", "firstname lastname");

        if (!team) {
            return res.json({ message: "No team found." });
        }

        return res.status(201).json({
            message: 'Team fetched successfully!',
            team,
        });
    } catch (error) {
        console.error("Failed to fetch team detail:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/fetch-members', async (req, res) => {
    try {

        // Find users with status 'pending' and role not equal to 'admin'
        const members = await User.find({
            role: { $eq: "member" },
            status: { $ne: "pending" }
        });

        // If no users found, respond with an empty array
        if (!members || members.length === 0) {
            return res.status(201).json({ message: "No members found...", users: [] });
        }

        // Respond with the list of pending users
        res.status(201).json({ message: "Succefully records fetched...", users: members });
    } catch (error) {
        // Handle any errors that occur during the query
        console.error("Error fetching members:", error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }

});


router.get("/remove-member/:id", async (req, res) => {
    const id = req.params.id;
    console.log(id);
    try {
        // Find the team and remove the member from the 'members' array
        const team = await Team.findOneAndUpdate(
            { "members.user": id }, // Find the team with the specified member
            { $pull: { members: { user: id } } }, // Remove the member from the 'members' array
            { new: true } // Return the updated team document
        );

        // Check if the team was found and the member was removed
        if (!team) {
            return res.json({ message: 'Team not found or member not found in the team.' });
        }

        return res.status(201).json({ message: 'Member removed successfully', team });

    } catch (error) {
        console.error("Failed  >> " + error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.post("/add-member", async (req, res) => {
    try {


        const { tid, member } = req.body;
        console.log(tid, member);

        const user = await User.findById(member);

        // Update the team by pushing the member as an object with an email field
        const add = await Team.findByIdAndUpdate(
            tid,
            { $push: { members: { user: user._id } } }, // Ensure member is added as an object with an email key
            { new: true }
        );
        const team = await Team.findById(tid);


        // Send OTP email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const SendEmail = await transporter.sendMail({
            to: user.email,
            // subject: 'Happy Hacking'
            subject: 'Welcome || You are added',
            text: `Dear member you have been added to team ${team.name}. Your team leader will contact soon. \n\nRegards,\nTaskQuest Team`
        });

        if (SendEmail) {
            res.status(201).json({ message: "Added successfully" });
        } else {
            res.status(500).json({ message: "Internal Server error", error: error.message });
        }

    } catch (error) {
        console.error("error in adding member >>" + error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }

});

// Export the router
module.exports = router;
