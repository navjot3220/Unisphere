import "dotenv/config";
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Club from "./models/Club.js";
import Event from "./models/Event.js";
import Registration from "./models/Registration.js";
import { computeEngagement } from "./services/recommender.js";

const daysFromNow = (d, h = 17) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(h, 0, 0, 0);
  return date;
};
const hoursLater = (date, h) => new Date(date.getTime() + h * 3600 * 1000);

export async function seedDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Club.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
  ]);
  console.log("[seed] cleared collections");

  // --- Users (password for everyone: Password123) ---
  const mk = (name, email, role, department, interests) =>
    User.create({ name, email, password: "Password123", role, department, interests });

  const admin = await mk("Avery Admin", "admin@unisphere.dev", "admin", "Administration", []);
  const faculty1 = await mk("Dr. Rhea Kapoor", "rhea@unisphere.dev", "faculty", "Computer Science", ["tech", "workshop"]);
  const faculty2 = await mk("Prof. Dan Whitfield", "dan@unisphere.dev", "faculty", "Business", ["career", "social"]);

  const students = await Promise.all([
    mk("Sam Chen", "sam@unisphere.dev", "student", "Computer Science", ["tech", "workshop"]),
    mk("Priya Nair", "priya@unisphere.dev", "student", "Computer Science", ["tech", "cultural"]),
    mk("Jordan Lee", "jordan@unisphere.dev", "student", "Business", ["career", "sports"]),
    mk("Fatima Hassan", "fatima@unisphere.dev", "student", "Arts", ["arts", "cultural"]),
    mk("Mike O'Brien", "mike@unisphere.dev", "student", "Kinesiology", ["sports", "social"]),
    mk("Lena Petrova", "lena@unisphere.dev", "student", "Business", ["career", "tech"]),
  ]);
  const [sam, priya, jordan, fatima, mike, lena] = students;
  console.log(`[seed] users: ${students.length + 3}`);

  // --- Clubs ---
  const codingClub = await Club.create({
    name: "Coding Club",
    description: "Weekly builds, hackathons, and tech talks.",
    category: "tech",
    coordinator: faculty1._id,
    members: [sam._id, priya._id, lena._id],
  });
  const bizSociety = await Club.create({
    name: "Business Society",
    description: "Networking nights, case competitions, career prep.",
    category: "career",
    coordinator: faculty2._id,
    members: [jordan._id, lena._id],
  });
  const artsCollective = await Club.create({
    name: "Arts Collective",
    description: "Exhibitions, open mics, and studio sessions.",
    category: "arts",
    coordinator: faculty2._id,
    members: [fatima._id, priya._id],
  });
  await User.updateOne({ _id: sam._id }, { clubs: [codingClub._id] });
  await User.updateOne({ _id: priya._id }, { clubs: [codingClub._id, artsCollective._id] });
  await User.updateOne({ _id: jordan._id }, { clubs: [bizSociety._id] });
  await User.updateOne({ _id: fatima._id }, { clubs: [artsCollective._id] });
  await User.updateOne({ _id: lena._id }, { clubs: [codingClub._id, bizSociety._id] });
  console.log("[seed] clubs: 3");

  // --- Past events (history feeds the AI: forecasts, smart slots, affinity) ---
  const past = [];
  const pastDefs = [
    ["Intro to Git Workshop", "tech", codingClub, faculty1, -30, 17, 40],
    ["Hack Night #4", "tech", codingClub, faculty1, -21, 18, 60],
    ["Resume Clinic", "career", bizSociety, faculty2, -14, 14, 50],
    ["Open Mic Evening", "arts", artsCollective, faculty2, -10, 19, 80],
    ["Intramural Kickoff", "sports", null, faculty2, -7, 16, 100],
  ];
  for (const [title, category, club, organizer, dayOffset, hour, capacity] of pastDefs) {
    const startsAt = daysFromNow(dayOffset, hour);
    past.push(
      await Event.create({
        title,
        description: `${title} — a past event used to train recommendations.`,
        category,
        location: "Main Campus",
        startsAt,
        endsAt: hoursLater(startsAt, 2),
        capacity,
        organizer: organizer._id,
        club: club?._id || null,
        status: "approved",
        remindersSent: true,
      })
    );
  }

  // --- Upcoming events ---
  const up = async (title, description, category, club, organizer, dayOffset, hour, capacity, location, status = "approved") => {
    const startsAt = daysFromNow(dayOffset, hour);
    return Event.create({
      title, description, category, location,
      startsAt, endsAt: hoursLater(startsAt, 2),
      capacity, organizer: organizer._id, club: club?._id || null, status,
    });
  };

  const hackathon = await up("Spring Hackathon", "24 hours. Teams of 4. Real prizes. Ship something.", "tech", codingClub, faculty1, 5, 9, 120, "Engineering Atrium");
  const aiTalk = await up("AI in Industry: Guest Talk", "A senior ML engineer on what actually ships in production.", "tech", codingClub, faculty1, 3, 17, 80, "Lecture Hall B");
  const careerFair = await up("Fall Career Fair Prep", "Portfolio reviews and mock interviews with alumni.", "career", bizSociety, faculty2, 7, 13, 60, "Business Building 204");
  const galleryNight = await up("Student Gallery Night", "One night. Forty artists. Free entry with your pass.", "arts", artsCollective, faculty2, 6, 19, 100, "Fine Arts Gallery");
  const yogaSession = await up("Sunrise Yoga on the Quad", "All levels. Mats provided. Bring water.", "sports", null, faculty2, 2, 7, 40, "Central Quad");
  await up("Robotics Demo Day", "Student-built robots, live obstacle course.", "workshop", codingClub, sam, 9, 15, 70, "Maker Lab", "pending");
  await up("Culture Fest Planning Meetup", "Help plan the biggest cultural event of the term.", "cultural", artsCollective, fatima, 4, 18, 30, "Student Centre 12", "pending");
  console.log("[seed] events: 12 (5 past, 5 approved upcoming, 2 pending)");

  // --- Registrations + check-ins (history) ---
  const reg = async (event, user, checkedIn = false) => {
    await Registration.create({
      event: event._id,
      user: user._id,
      status: checkedIn ? "checked_in" : "registered",
      checkedInAt: checkedIn ? event.startsAt : null,
      checkedInBy: checkedIn ? "qr" : null,
    });
    await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } });
  };

  // Past attendance patterns feed category affinity + forecasts
  await reg(past[0], sam, true);
  await reg(past[0], priya, true);
  await reg(past[0], lena, false);
  await reg(past[1], sam, true);
  await reg(past[1], priya, false);
  await reg(past[1], lena, true);
  await reg(past[2], jordan, true);
  await reg(past[2], lena, true);
  await reg(past[3], fatima, true);
  await reg(past[3], priya, true);
  await reg(past[4], mike, true);
  await reg(past[4], jordan, false);

  // Upcoming registrations (co-registration powers "Students Also Attended")
  await reg(hackathon, sam);
  await reg(hackathon, priya);
  await reg(hackathon, lena);
  await reg(aiTalk, sam);
  await reg(aiTalk, lena);
  await reg(careerFair, jordan);
  await reg(careerFair, lena);
  await reg(galleryNight, fatima);
  await reg(galleryNight, priya);
  await reg(yogaSession, mike);
  console.log("[seed] registrations: 22");

  for (const s of students) await computeEngagement(s._id);
  console.log("[seed] engagement scores computed");

  console.log(`
Demo accounts (password for all: Password123)
  admin@unisphere.dev   — Admin
  rhea@unisphere.dev    — Faculty / Coding Club coordinator
  dan@unisphere.dev     — Faculty / Business & Arts coordinator
  sam@unisphere.dev     — Student, CS, Coding Club
  jordan@unisphere.dev  — Student, Business
  fatima@unisphere.dev  — Student, Arts
`);
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  async function run() {
    let uri = process.env.MONGO_URI;
    let mongoServer = null;
    if (!uri || uri.includes("localhost")) {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }
    await connectDB(uri);
    await seedDatabase();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
