import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";
import Roadmap from "../src/models/Roadmap.js";
import Topic from "../src/models/Topic.js";
import Lesson from "../src/models/Lesson.js";
import DsaQuestion from "../src/models/DsaQuestion.js";
import Progress from "../src/models/Progress.js";

test("MongoDB auth, progress, and admin content workflows", { skip: !process.env.MONGO_TEST_URI }, async () => {
  await connectDatabase(process.env.MONGO_TEST_URI);
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const studentEmail = `student-${unique}@example.test`;
  const disposableStudentEmail = `disposable-${unique}@example.test`;
  const adminEmail = `admin-${unique}@example.test`;
  const password = "integration-test-password";
  let student;
  let disposableStudent;
  let admin;
  let topic;
  let secondTopic;
  let dsaLesson;
  let dsaQuestion;
  let customRoadmap;
  let customTopic;
  let customLesson;
  try {
    const mern = await Roadmap.findOne({ type: "mern" });
    const dsa = await Roadmap.findOne({ type: "dsa" });
    assert.ok(mern && dsa, "run the database seed before integration tests");
    const existingLesson = await Lesson.findOne({ isPublished: true });
    assert.ok(existingLesson, "seed data must include at least one published lesson");

    const studentAgent = request.agent(app);
    const registerResponse = await studentAgent.post("/api/auth/register").send({
      name: "Integration Learner",
      email: studentEmail,
      password,
      role: "admin",
      guestProgress: [`lesson:${existingLesson._id}`]
    });
    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.data.user.role, "student");
    assert.match(registerResponse.headers["set-cookie"].join(";"), /HttpOnly/i);
    student = registerResponse.body.data.user;
    const currentUser = await studentAgent.get("/api/auth/me");
    assert.equal(currentUser.body.data.user.email, studentEmail);
    assert.equal((await studentAgent.get("/api/progress")).body.data.length, 1, "signup imports guest progress");

    const studentAdminResponse = await studentAgent.get("/api/admin/overview");
    assert.equal(studentAdminResponse.status, 403, "student role cannot access administrator APIs");
    const originDenied = await request(app).post("/api/auth/login").set("Origin", "https://attacker.example").send({ email: studentEmail, password });
    assert.equal(originDenied.status, 403, "state-changing requests reject unknown browser origins");
    const secondLesson = await Lesson.findOne({ _id: { $ne: existingLesson._id }, isPublished: true });
    const createdProgress = await studentAgent.post("/api/progress").send({ contentType: "lesson", contentId: secondLesson._id.toString(), completed: true });
    assert.equal(createdProgress.status, 200);
    const idempotentProgress = await studentAgent.post("/api/progress").send({ contentType: "lesson", contentId: secondLesson._id.toString(), completed: true });
    assert.equal(idempotentProgress.status, 200);
    assert.equal((await studentAgent.get("/api/progress")).body.data.length, 2, "progress upsert prevents duplicate records");
    assert.equal((await studentAgent.patch(`/api/progress/${secondLesson._id}`).send({ contentType: "lesson", completed: false })).status, 200);
    assert.equal((await studentAgent.get("/api/progress")).body.data.length, 1);
    await studentAgent.post("/api/progress").send({ contentType: "lesson", contentId: secondLesson._id.toString(), completed: true });
    assert.equal((await studentAgent.delete(`/api/progress/${secondLesson._id}`).send({ contentType: "lesson" })).status, 200);

    const dashboard = await studentAgent.get("/api/progress/dashboard");
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.data.progress.mern.completed, 1);
    const profile = await studentAgent.patch("/api/auth/profile").send({ name: "Updated Learner" });
    assert.equal(profile.body.data.user.name, "Updated Learner");

    admin = await User.create({ name: "Integration Admin", email: adminEmail, password, role: "admin" });
    const adminAgent = request.agent(app);
    const loginResponse = await adminAgent.post("/api/auth/login").send({ email: adminEmail, password });
    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.data.user.role, "admin");
    assert.equal((await adminAgent.get("/api/admin/overview")).status, 200);
    const courseResponse = await adminAgent.post("/api/admin/roadmaps").send({
      title: `Integration Course ${unique}`,
      type: "course",
      pathType: "Data Science",
      description: "A course created dynamically by an administrator.",
      order: 99,
      isPublished: true
    });
    assert.equal(courseResponse.status, 201);
    customRoadmap = courseResponse.body.data.item;
    assert.equal(customRoadmap.slug, `integration-course-${unique}`);
    assert.equal(customRoadmap.pathType, "Data Science");
    const overviewCourses = (await adminAgent.get("/api/admin/overview")).body.data.courses;
    assert.ok(overviewCourses.some(course => course._id === customRoadmap._id && course.type === "course"));
    const customTopicResponse = await adminAgent.post("/api/admin/topics").send({
      roadmapId: customRoadmap._id,
      title: `Integration Module ${unique}`,
      description: "A module inside the dynamically created course.",
      order: 0,
      isPublished: true
    });
    assert.equal(customTopicResponse.status, 201);
    customTopic = customTopicResponse.body.data.item;
    const customLessonResponse = await adminAgent.post("/api/admin/lessons").send({
      topicId: customTopic._id,
      title: `Integration Video ${unique}`,
      description: "A dynamically created course video lesson.",
      youtubeUrl: "https://www.youtube.com/watch?v=UB1O30fR-EE",
      duration: "11 min",
      order: 0,
      isPublished: true
    });
    assert.equal(customLessonResponse.status, 201);
    customLesson = customLessonResponse.body.data.item;
    const customRoadmapPublic = await request(app).get(`/api/roadmaps/${customRoadmap.slug}`);
    assert.equal(customRoadmapPublic.status, 200);
    assert.equal(customRoadmapPublic.body.data.topics[0].itemCount, 1);
    assert.equal((await studentAgent.post("/api/progress").send({ contentType: "lesson", contentId: customLesson._id, completed: true })).status, 200);
    const customDashboard = await studentAgent.get("/api/progress/dashboard");
    assert.equal(customDashboard.body.data.progress[customRoadmap.slug].completed, 1);
    assert.equal(customDashboard.body.data.continueLearning[customRoadmap.slug], null);
    const studentList = await adminAgent.get("/api/admin/users");
    assert.equal(studentList.status, 200);
    assert.equal(studentList.body.data.items.find(user => user._id === student.id).isBlocked, false);
    assert.equal((await studentAgent.patch(`/api/admin/users/${student.id}/block`).send({ isBlocked: true })).status, 403);

    const topicResponse = await adminAgent.post("/api/admin/topics").send({
      roadmapId: mern._id.toString(),
      title: `Integration topic ${unique}`,
      description: "Temporary integration-test topic.",
      order: 9999,
      isPublished: true
    });
    assert.equal(topicResponse.status, 201);
    topic = topicResponse.body.data.item;
    assert.equal(topic.slug, `integration-topic-${unique}`);
    const secondTopicResponse = await adminAgent.post("/api/admin/topics").send({
      roadmapId: mern._id.toString(),
      title: `Integration reorder ${unique}`,
      order: 10000,
      isPublished: true
    });
    assert.equal(secondTopicResponse.status, 201);
    secondTopic = secondTopicResponse.body.data.item;
    assert.equal((await adminAgent.patch(`/api/admin/topics/${secondTopic._id}/reorder`).send({ direction: "up" })).status, 200);
    const reorderedTopics = (await adminAgent.get(`/api/admin/topics?roadmapId=${mern._id}`)).body.data;
    assert.ok(reorderedTopics.findIndex(item => item._id === secondTopic._id) < reorderedTopics.findIndex(item => item._id === topic._id));
    const missingVideo = await adminAgent.post("/api/admin/lessons").send({
      topicId: topic._id,
      title: "Lesson missing video",
      description: "This lesson is expected to fail validation.",
      duration: "3 min",
      order: 0
    });
    assert.equal(missingVideo.status, 400);
    assert.equal(missingVideo.body.message, "Add a YouTube lecture URL for this lesson.");
    const problemOnMernLesson = await adminAgent.post("/api/admin/lessons").send({
      topicId: topic._id,
      title: "MERN lesson with wrong link",
      description: "This lesson is expected to fail validation.",
      youtubeUrl: "https://www.youtube.com/watch?v=UB1O30fR-EE",
      duration: "3 min",
      problemUrl: "https://leetcode.com/problems/two-sum/"
    });
    assert.equal(problemOnMernLesson.status, 400);
    const invalidVideo = await adminAgent.post("/api/admin/lessons").send({
      topicId: topic._id,
      title: "Lesson with invalid video",
      description: "This lesson is expected to fail validation.",
      youtubeUrl: "https://example.com/video",
      duration: "3 min"
    });
    assert.equal(invalidVideo.status, 400);
    assert.equal(invalidVideo.body.message, "Enter a valid YouTube video URL.");
    const lessonResponse = await adminAgent.post("/api/admin/lessons").send({
      topicId: topic._id,
      title: "Integration lesson",
      description: "Temporary lesson for API integration tests.",
      youtubeUrl: "https://www.youtube.com/watch?v=UB1O30fR-EE",
      duration: "3 min",
      order: 0,
      isPublished: true
    });
    assert.equal(lessonResponse.status, 201);
    const lesson = lessonResponse.body.data.item;
    assert.equal(lesson.youtubeVideoId, "UB1O30fR-EE");
    const readLesson = await request(app).get(`/api/lessons/${topic.slug}/${lesson.slug}`);
    assert.equal(readLesson.status, 200);
    assert.equal(readLesson.body.data.title, "Integration lesson");
    const listedLesson = (await adminAgent.get("/api/admin/lessons")).body.data.find(item => item._id === lesson._id);
    assert.equal(listedLesson.topicId.roadmapId.type, "mern");
    const updated = await adminAgent.patch(`/api/admin/lessons/${lesson._id}`).send({ title: "Updated integration lesson", order: 1 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.item.title, "Updated integration lesson");
    assert.equal(updated.body.data.item.youtubeVideoId, "UB1O30fR-EE");
    assert.equal((await adminAgent.delete(`/api/admin/lessons/${lesson._id}`)).status, 200);
    assert.equal((await request(app).get(`/api/lessons/${topic.slug}/${lesson.slug}`)).status, 404);

    const dsaTopic = await Topic.findOne({ roadmapId: dsa._id, isPublished: true });
    const dsaLessonResponse = await adminAgent.post("/api/admin/lessons").send({
      topicId: dsaTopic._id.toString(),
      title: `Unified DSA lesson ${unique}`,
      description: "Temporary DSA lesson with an optional related problem link.",
      youtubeUrl: "https://youtu.be/UB1O30fR-EE",
      duration: "8 min",
      problemUrl: "https://leetcode.com/problems/two-sum/",
      order: 9999,
      isPublished: true
    });
    assert.equal(dsaLessonResponse.status, 201);
    dsaLesson = dsaLessonResponse.body.data.item;
    assert.equal(dsaLesson.youtubeVideoId, "UB1O30fR-EE");
    assert.equal(dsaLesson.problemUrl, "https://leetcode.com/problems/two-sum/");
    const readDsaLesson = await request(app).get(`/api/lessons/${dsaTopic.slug}/${dsaLesson.slug}`);
    assert.equal(readDsaLesson.status, 200);
    assert.equal(readDsaLesson.body.data.problemUrl, dsaLesson.problemUrl);
    const questionResponse = await adminAgent.post("/api/admin/dsa-questions").send({
      topicId: dsaTopic._id.toString(),
      title: `DSA Sheet Two Sum ${unique}`,
      url: "https://leetcode.com/problems/two-sum/",
      order: 9999,
      isPublished: true
    });
    assert.equal(questionResponse.status, 201);
    dsaQuestion = questionResponse.body.data.item;
    const invalidTopicQuestion = await adminAgent.post("/api/admin/dsa-questions").send({
      topicId: topic._id.toString(),
      title: "Not a DSA question",
      url: "https://leetcode.com/problems/two-sum/"
    });
    assert.equal(invalidTopicQuestion.status, 400, "DSA questions must belong to DSA topics");
    const topicWithSheet = await request(app).get(`/api/topics/${dsaTopic.slug}?roadmap=dsa`);
    assert.equal(topicWithSheet.status, 200);
    assert.ok(topicWithSheet.body.data.questions.some(item => item._id === dsaQuestion._id));
    const dsaRoadmapWithSheet = await request(app).get("/api/roadmaps/dsa");
    const dsaTopicCard = dsaRoadmapWithSheet.body.data.topics.find(item => item._id === dsaTopic._id.toString());
    assert.ok(dsaTopicCard.questionIds.includes(dsaQuestion._id.toString()));
    assert.equal(dsaTopicCard.itemCount, dsaTopicCard.itemIds.length + dsaTopicCard.questionIds.length);
    assert.equal((await adminAgent.get("/api/admin/dsa-questions")).body.data.some(item => item._id === dsaQuestion._id), true);
    const questionProgress = await studentAgent.post("/api/progress/sync").send({ items: [`dsaQuestion:${dsaQuestion._id}`] });
    assert.equal(questionProgress.status, 200);
    assert.ok((await studentAgent.get("/api/progress")).body.data.some(item => item.contentType === "dsaQuestion" && item.contentId === dsaQuestion._id));
    const dsaProgress = await studentAgent.post("/api/progress").send({ contentType: "lesson", contentId: dsaLesson._id, completed: true });
    assert.equal(dsaProgress.status, 200);
    const dsaDashboard = await studentAgent.get("/api/progress/dashboard");
    assert.equal(dsaDashboard.body.data.progress.dsa.completed, 2);
    assert.equal(dsaDashboard.body.data.progress.dsa.total >= 2, true);
    assert.equal((await adminAgent.delete(`/api/admin/dsa-questions/${dsaQuestion._id}`)).status, 200);
    assert.equal(await Progress.exists({ contentId: dsaQuestion._id, contentType: "dsaQuestion" }), null, "deleting a DSA question also removes learner progress");
    dsaQuestion = null;
    const searchResponse = await request(app).get("/api/search?q=Unified%20DSA%20lesson");
    assert.equal(searchResponse.status, 200);
    assert.ok(searchResponse.body.data.some(item => item.title === dsaLesson.title && item.kind === "lesson"));
    assert.equal((await adminAgent.get("/api/admin/problems")).status, 404);
    assert.equal((await adminAgent.post("/api/admin/problems").send({})).status, 404);
    assert.equal((await request(app).get("/api/dsa/problems")).status, 404);
    assert.equal((await adminAgent.delete(`/api/admin/lessons/${dsaLesson._id}`)).status, 200);
    dsaLesson = null;
    assert.equal((await adminAgent.delete(`/api/admin/topics/${topic._id}`)).status, 200);
    assert.equal((await adminAgent.delete(`/api/admin/topics/${secondTopic._id}`)).status, 200);

    const blocked = await adminAgent.patch(`/api/admin/users/${student.id}/block`).send({ isBlocked: true });
    assert.equal(blocked.status, 200);
    assert.equal(blocked.body.data.isBlocked, true);
    assert.equal((await studentAgent.get("/api/progress")).status, 403, "blocking revokes access from an existing session");
    assert.equal((await request(app).post("/api/auth/login").send({ email: studentEmail, password })).status, 403, "blocked students cannot sign in");
    assert.equal((await adminAgent.patch(`/api/admin/users/${student.id}/block`).send({ isBlocked: false })).body.data.isBlocked, false);
    assert.equal((await studentAgent.get("/api/progress")).status, 200, "unblocking restores access to the existing session");

    disposableStudent = await User.create({ name: "Disposable Learner", email: disposableStudentEmail, password, role: "student" });
    await Progress.create({ userId: disposableStudent._id, contentType: "lesson", contentId: existingLesson._id, completed: true });
    assert.equal((await adminAgent.delete(`/api/admin/users/${disposableStudent._id}`)).status, 200);
    assert.equal(await User.exists({ _id: disposableStudent._id }), null);
    assert.equal(await Progress.exists({ userId: disposableStudent._id }), null, "deleting a student also removes their progress");
    assert.equal((await adminAgent.delete(`/api/admin/users/${admin._id}`)).status, 404, "student-management endpoints cannot delete administrators");
    assert.equal((await adminAgent.delete(`/api/admin/roadmaps/${customRoadmap._id}`)).status, 200);
    assert.equal(await Lesson.exists({ _id: customLesson._id }), null, "deleting a course also deletes its topics and lessons");
    assert.equal(await Progress.exists({ userId: student.id, contentId: customLesson._id }), null, "deleting a course also removes learner progress");
    customRoadmap = null;
    customLesson = null;

    assert.equal((await adminAgent.post("/api/auth/logout")).status, 200);
    assert.equal((await studentAgent.post("/api/auth/logout")).status, 200);
  } finally {
    if (student) await Progress.deleteMany({ userId: student.id });
    if (customLesson) await Progress.deleteMany({ contentId: customLesson._id });
    if (customRoadmap) {
      const customTopicIds = await Topic.find({ roadmapId: customRoadmap._id }).distinct("_id");
      await Promise.all([
        Lesson.deleteMany({ topicId: { $in: customTopicIds } }),
        Topic.deleteMany({ roadmapId: customRoadmap._id }),
        Roadmap.deleteOne({ _id: customRoadmap._id })
      ]);
    }
    await User.deleteMany({ email: { $in: [studentEmail, disposableStudentEmail, adminEmail] } });
    if (dsaLesson) {
      await Progress.deleteMany({ contentId: dsaLesson._id });
      await Lesson.deleteOne({ _id: dsaLesson._id });
    }
    if (dsaQuestion) {
      await Progress.deleteMany({ contentId: dsaQuestion._id });
      await DsaQuestion.deleteOne({ _id: dsaQuestion._id });
    }
    const temporaryTopics = [topic, secondTopic].filter(Boolean).map(item => item._id);
    if (temporaryTopics.length) {
      const lessons = await Lesson.find({ topicId: { $in: temporaryTopics } }).select("_id");
      await Progress.deleteMany({ contentId: { $in: lessons.map(item => item._id) } });
      await Promise.all([
        Lesson.deleteMany({ topicId: { $in: temporaryTopics } }),
        Topic.deleteMany({ _id: { $in: temporaryTopics } })
      ]);
    }
    if (process.env.MONGO_TEST_URI) await mongoose.disconnect();
  }
});
