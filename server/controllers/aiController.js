import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'
const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) =>{
    try{
        const {userId} = req.auth();
        const {prompt, length} = req.body;
        const plan = req.plan;
        const free_usage= req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({success:false, message: 'Limit reached. Upgrade to continue'})
        }
        const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature:0.7,
    max_tokens:length,
});
   
const content = response.choices[0].message.content

await sql` INSERT INTO creations (user_id, prompt, content, type) 
VALUES (${userId}, ${prompt}, ${content}, 'article')
`
if(plan !== 'premium'){
    await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata:{
            free_usage:free_usage + 1
        }
    })
}

res.json({success:true, content})
    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

export const generateBlogTitle = async (req, res) =>{
    try{
        const {userId} = req.auth();
        const {prompt, length} = req.body;
        const plan = req.plan;
        const free_usage= req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({success:false, message: 'Limit reached. Upgrade to continue'})
        }
        const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [{
            role: "user",
            content: prompt,},],
    temperature:0.7,
    max_tokens:100,
});
   
const content = response.choices[0].message.content

await sql` INSERT INTO creations (user_id, prompt, content, type) 
VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
`
if(plan !== 'premium'){
    await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata:{
            free_usage:free_usage + 1
        }
    })
}

res.json({success:true, content})
    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}
export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        console.log('User Plan (inside generateImage):', plan); // Confirming plan
        console.log('User ID (inside generateImage):', userId); // Confirming user ID

        if (plan !== 'premium') {
            return res.json({ success: false, message: 'This feature is only available for premium subscriptions' });
        }

        const formData = new FormData();
        formData.append('prompt', prompt);

        // --- Potentially problematic call to Clipdrop ---
        const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
            method: 'POST', // Axios defaults to POST for axios.post(), so this line is redundant but harmless.
            headers: {
                'x-api-key': process.env.CLIPDROP_API_KEY,
            },
            responseType: "arraybuffer",
        });

        // --- Corrected Buffer conversion (make sure this is saved!) ---
        const base64Image = `data:image/png;base64, ${Buffer.from(data, 'binary').toString('base64')}`;

        // --- Potentially problematic call to Cloudinary ---
        const { secure_url } = await cloudinary.uploader.upload(base64Image);

        // --- Potentially problematic SQL insert ---
        await sql` INSERT INTO creations (user_id, prompt, content, type, publish) 
                   VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;

        res.json({ success: true, content: secure_url });

    } catch (error) {
        // --- ADD THIS DETAILED LOGGING ---
        console.error("----- Error in generateImage -----");
        console.error("Full Error Object:", error);
        if (error.response) { // This means it's an Axios error response from an API call (Clipdrop or Cloudinary)
            console.error("Error Response Status:", error.response.status);
            console.error("Error Response Data:", error.response.data ? error.response.data.toString() : 'No response data'); // Convert buffer to string if necessary
            console.error("Error Response Headers:", error.response.headers);
        } else if (error.request) { // The request was made but no response was received
            console.error("Error Request (no response):", error.request);
        } else { // Something else happened in setting up the request or during execution
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        }
        console.error("---------------------------------");

        // Send a generic message to the frontend, as before
        res.json({ success: false, message: 'Please subscribe to premium to unlock this feature .' });
    }
};
export const removeImageBackground = async (req, res) =>{
    try{
        const {userId} = req.auth();
        const image = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({success:false, message: error.message})
        }

const {secure_url} = await cloudinary.uploader.upload(image.path, {
    transformation:[{
        effect:'background_removal',
        background_removal:'remove_the_background'
    }]
});

await sql` INSERT INTO creations (user_id, prompt, content, type) 
VALUES (${userId}, 
'Remove background from image', ${secure_url}, 'image')
`

res.json({success:true, content:secure_url})
    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}
export const removeImageObject = async (req, res) =>{
    try{
        const {userId} = req.auth();
        const {object} = req.body;
        const image = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({success:false, message: 'This feature is only available for premium subscriptions'})
        }

const {public_id} = await cloudinary.uploader.upload(image.path);

const imageUrl = cloudinary.url(public_id, {
    transformation:[{effect: `gen_remove: ${object}`}],
    resource_type:'image'
})

await sql` INSERT INTO creations (user_id, prompt, content, type) 
VALUES (${userId}, 
${`Removed ${object} from image`}, ${imageUrl}, 'image')`

res.json({success:true, content:imageUrl})
    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}
export const resumeReview = async (req, res) =>{
    try{
        const {userId} = req.auth();
        const resume = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({success:false, message: 'This feature is only available for premium subscriptions'})
        }

if(resume.size > 5*1024*1024){
    return res.json({success:false, message:'Resume file size exceeds allowed size (5MB).'})
}
const dataBuffer = fs.readFileSync(resume.path)
const pdfData = await pdf(dataBuffer);

const prompt = `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement . Resume Content: \n\n${pdfData.text}`

const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature:0.7,
    max_tokens:1000,
});
   
const content = response.choices[0].message.content

await sql` INSERT INTO creations (user_id, prompt, content, type) 
VALUES (${userId},'Review the uploaded resume',${content} 'resume-review')`;

res.json({success:true, content})
    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}