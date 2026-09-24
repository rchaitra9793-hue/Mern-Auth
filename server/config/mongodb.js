import mongoose from "mongoose";

const connectDB = async ()=>{

    mongoose.connection.on('connected', ()=>console.log("Database Connected"));

    // Home connections often drop the DNS lookup Atlas needs, so retry before giving up
    const attempts = 5;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await mongoose.connect(`${process.env.MONGODB_URI}/mern-auth`, {
                serverSelectionTimeoutMS: 15000,
            });
            return;
        } catch (error) {
            console.error(`Database connection attempt ${attempt}/${attempts} failed:`, error.message);
            if (attempt === attempts) {
                console.error("Could not reach the database. Check your internet connection and MONGODB_URI in .env");
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
};

export default connectDB;
