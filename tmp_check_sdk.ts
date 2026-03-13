import { GoogleGenAI } from "@google/genai";

try {
    const genAI = new GoogleGenAI("FAKE_KEY");
    console.log("genAI properties:", Object.keys(genAI));
    // Check if getGenerativeModel exists
    if (typeof genAI.getGenerativeModel === 'function') {
        console.log("getGenerativeModel exists");
    }
    // Check if models property exists
    if ((genAI as any).models) {
        console.log("models property exists");
    }
} catch (e) {
    console.error("Error checking GoogleGenAI:", e);
}
