import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import User from "../models/User.js";
import Roadmap from "../models/Roadmap.js";
import Topic from "../models/Topic.js";
import Lesson from "../models/Lesson.js";
import { slugify } from "./slug.js";
import { youtubeIdFromUrl } from "./youtube.js";
import { seedAdmin } from "./seedAdmin.js";

const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
if (Boolean(seedAdminEmail) !== Boolean(seedAdminPassword)) {
  throw new Error("Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to seed an administrator.");
}
if (seedAdminPassword && seedAdminPassword.length < 10) {
  throw new Error("SEED_ADMIN_PASSWORD must contain at least 10 characters.");
}

const mernTopics = [
  ["HTML", "Learn semantic structure and build accessible pages.", [["Your first HTML page", "Meet the building blocks behind every webpage.", "UB1O30fR-EE", "5 min"], ["Elements & attributes", "Understand tags, attributes, and how elements fit together.", "UB1O30fR-EE", "12 min"], ["Forms & semantic HTML", "Create accessible forms and give content meaning.", "UB1O30fR-EE", "18 min"]]],
  ["CSS", "Turn structure into polished, responsive experiences.", [["CSS fundamentals", "Selectors, the cascade, and your first styles.", "yfoY53QXEnI", "14 min"], ["Flexbox & Grid", "Build layouts that work across every screen size.", "JJSoEo8JSnc", "22 min"], ["Responsive design", "Use fluid layouts and media queries with confidence.", "srvUrASNj0s", "16 min"]]],
  ["JavaScript", "Learn the language that makes the web interactive.", [["Introduction to JavaScript", "Get set up and write your first JavaScript.", "W6NZfCO5SIk", "9 min"], ["Variables & data types", "Work with strings, numbers, booleans, and variables.", "W6NZfCO5SIk", "18 min"], ["Operators", "Combine values and make decisions with operators.", "W6NZfCO5SIk", "14 min"], ["Conditional statements", "Choose what your program does with if, else, and switch.", "W6NZfCO5SIk", "16 min"], ["Loops", "Repeat work cleanly with loops and iteration methods.", "W6NZfCO5SIk", "20 min"], ["Functions", "Package reusable logic with declarations and arrow functions.", "W6NZfCO5SIk", "24 min"], ["Arrays", "Store ordered data and transform it with array methods.", "W6NZfCO5SIk", "26 min"], ["Objects", "Model real-world data with keys, values, and methods.", "W6NZfCO5SIk", "20 min"], ["The DOM", "Select and update elements on a webpage.", "W6NZfCO5SIk", "23 min"], ["Events", "Respond to clicks, input, and browser events.", "W6NZfCO5SIk", "19 min"], ["Modern JavaScript", "Use destructuring, modules, and template strings.", "W6NZfCO5SIk", "25 min"], ["Async JavaScript", "Understand asynchronous code and promises.", "W6NZfCO5SIk", "30 min"], ["Fetch API", "Request data from APIs and handle responses.", "W6NZfCO5SIk", "18 min"]]],
  ["Git & GitHub", "Track your work and collaborate like a developer.", [["Git essentials", "Create commits and navigate project history.", "RGOj5yH7evk", "20 min"], ["Working with GitHub", "Push projects, open pull requests, and collaborate.", "RGOj5yH7evk", "24 min"]]],
  ["React", "Build interactive user interfaces with reusable components.", [["Thinking in React", "Create your first component and learn the React mental model.", "bMknfKXif5", "18 min"], ["Components & props", "Compose interfaces from reusable building blocks.", "bMknfKXif5", "24 min"], ["State & events", "Make components interactive with state.", "bMknfKXif5", "28 min"], ["Hooks & useEffect", "Manage side effects and external systems.", "bMknfKXif5", "32 min"], ["Routing", "Build multi-page experiences with client navigation.", "bMknfKXif5", "23 min"]]],
  ["Tailwind CSS", "Style interfaces rapidly with a utility-first toolkit.", [["Getting started", "Set up Tailwind and style your first components.", "ft30zcMlFao", "17 min"], ["Responsive utilities", "Build mobile-first interfaces with responsive modifiers.", "ft30zcMlFao", "18 min"]]],
  ["Node.js", "Run JavaScript on the server and work with the runtime.", [["Node.js fundamentals", "Understand the runtime and build your first server.", "Oe421EPjeBE", "25 min"], ["Modules & npm", "Organize code and use packages from npm.", "Oe421EPjeBE", "22 min"]]],
  ["Express.js", "Create capable APIs with a lightweight web framework.", [["Routes & middleware", "Build endpoints and compose request middleware.", "L72fhGm1tfE", "24 min"], ["REST API patterns", "Design resource-based APIs with HTTP semantics.", "L72fhGm1tfE", "26 min"]]],
  ["MongoDB", "Store application data in a flexible document database.", [["Documents & collections", "Get comfortable with the document database model.", "c2M-rlkkT5o", "22 min"], ["MongoDB with Mongoose", "Model application data and query it from Node.js.", "c2M-rlkkT5o", "28 min"]]],
  ["REST APIs", "Connect the frontend and backend with thoughtful APIs.", [["Designing REST APIs", "Choose resources, methods, and status codes.", "L72fhGm1tfE", "20 min"]]],
  ["Authentication", "Protect routes and build secure sign-in flows.", [["Authentication fundamentals", "Learn sessions, tokens, and security basics.", "L72fhGm1tfE", "26 min"]]],
  ["File Uploads", "Handle user uploads safely in a full-stack application.", [["Handling file uploads", "Accept files and connect to cloud storage.", "L72fhGm1tfE", "21 min"]]],
  ["Deployment", "Take a full-stack app from your laptop to the web.", [["Deploy your application", "Prepare environment variables and ship your first app.", "fBNz5xF-Kx4", "25 min"]]],
  ["Full-stack Projects", "Bring your skills together and build something real.", [["Plan a full-stack app", "Break an idea into a practical project.", "fBNz5xF-Kx4", "16 min"], ["Build and ship a MERN app", "Connect the stack in a real-world project.", "fBNz5xF-Kx4", "45 min"]]],
  ["Interview Preparation", "Review fundamentals and get ready to discuss your work.", [["MERN interview essentials", "Review core concepts behind a full-stack application.", "fBNz5xF-Kx4", "30 min"]]]
];

const dsaTopics = [
  ["Java Basics", "Get comfortable with Java syntax and tools for problem solving.", [["Java syntax & input", "Get started with Java structure, variables, and standard input.", "https://www.hackerrank.com/domains/java"]]],
  ["Time & Space Complexity", "Reason about how your solution scales as input grows.", [["Understanding Big O", "Compare common time and space complexity classes.", "https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/"]]],
  ["Basic Mathematics", "Explore number theory and arithmetic patterns.", [["Count digits", "Count how many digits are in a positive integer.", "https://www.geeksforgeeks.org/problems/count-digits-1606889545/1"], ["Reverse a number", "Reverse the digits of an integer.", "https://leetcode.com/problems/reverse-integer/"]]],
  ["Arrays", "Traverse, transform, and reason about contiguous data.", [["What is an array?", "Understand indexed collections and how elements are accessed.", "https://www.geeksforgeeks.org/array-data-structure/"], ["Array traversal", "Visit each element and understand basic traversal patterns.", "https://www.geeksforgeeks.org/"], ["Find maximum element", "Return the largest value in a non-empty array.", "https://www.geeksforgeeks.org/problems/largest-element-in-array4009/1"], ["Find second largest", "Find the second-largest distinct array value.", "https://www.geeksforgeeks.org/problems/second-largest3735/1"], ["Reverse an array", "Reverse an array in place using constant space.", "https://leetcode.com/problems/reverse-string/"], ["Remove duplicates", "Keep only unique values in a sorted array.", "https://leetcode.com/problems/remove-duplicates-from-sorted-array/"], ["Move zeroes", "Move zeroes to the end preserving element order.", "https://leetcode.com/problems/move-zeroes/"], ["Rotate array", "Rotate an array to the right by k steps.", "https://leetcode.com/problems/rotate-array/"], ["Two Sum", "Find two indices whose values add up to a target.", "https://leetcode.com/problems/two-sum/"]]],
  ["Strings", "Explore character data, patterns, and string transformations.", [["Valid palindrome", "Check whether a string reads the same forwards and backwards.", "https://leetcode.com/problems/valid-palindrome/"], ["Valid anagram", "Determine whether two strings contain the same characters.", "https://leetcode.com/problems/valid-anagram/"], ["Longest substring without repeating characters", "Find the longest substring with no repeated characters.", "https://leetcode.com/problems/longest-substring-without-repeating-characters/"]]],
  ["Sorting", "Understand sorting strategies and when each approach helps.", [["Bubble sort", "Sort values by repeatedly swapping adjacent elements.", "https://www.geeksforgeeks.org/bubble-sort-algorithm/"], ["Merge sort", "Sort an array with a divide-and-conquer strategy.", "https://www.geeksforgeeks.org/merge-sort/"]]],
  ["Binary Search", "Cut search spaces in half with a powerful technique.", [["Binary search", "Find a target in a sorted array in logarithmic time.", "https://leetcode.com/problems/binary-search/"], ["Lower bound", "Find the first position where a value may be inserted.", "https://www.geeksforgeeks.org/"], ["Search in rotated sorted array", "Search rotated sorted data in logarithmic time.", "https://leetcode.com/problems/search-in-rotated-sorted-array/"]]],
  ["Recursion", "Break problems down into smaller versions of themselves.", [["Recursion fundamentals", "Understand base cases and recursive calls.", "https://www.geeksforgeeks.org/recursion/"], ["Generate all subsets", "Generate the power set of distinct values.", "https://leetcode.com/problems/subsets/"]]],
  ["Linked List", "Work with connected nodes and flexible data structures.", [["Reverse a linked list", "Reverse a singly linked list.", "https://leetcode.com/problems/reverse-linked-list/"], ["Middle of the linked list", "Find the middle node with a single pass.", "https://leetcode.com/problems/middle-of-the-linked-list/"]]],
  ["Stack & Queue", "Use ordering rules to solve parsing and scheduling problems.", [["Valid parentheses", "Check whether brackets are correctly opened and closed.", "https://leetcode.com/problems/valid-parentheses/"], ["Implement a queue", "Build a first-in-first-out queue.", "https://leetcode.com/problems/implement-queue-using-stacks/"]]],
  ["Hashing", "Trade space for speed with maps and sets.", [["Contains duplicate", "Determine whether a value appears more than once.", "https://leetcode.com/problems/contains-duplicate/"]]],
  ["Sliding Window", "Process ranges efficiently without restarting work.", [["Maximum average subarray", "Find a contiguous fixed-length window with maximum average.", "https://leetcode.com/problems/maximum-average-subarray-i/"]]],
  ["Two Pointer", "Use coordinated indices to simplify sequence problems.", [["Two sum in a sorted array", "Find two values in sorted data that add up to a target.", "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/"]]],
  ["Greedy", "Make locally optimal choices and reason about correctness.", [["Jump Game", "Decide whether you can reach the final index.", "https://leetcode.com/problems/jump-game/"]]],
  ["Binary Trees", "Explore hierarchical structures and recursive traversals.", [["Maximum depth of binary tree", "Find the maximum nodes along a root-to-leaf path.", "https://leetcode.com/problems/maximum-depth-of-binary-tree/"]]],
  ["Binary Search Tree", "Use ordering properties to search and update tree data.", [["Search in a binary search tree", "Find a value in a binary search tree.", "https://leetcode.com/problems/search-in-a-binary-search-tree/"]]],
  ["Heap / Priority Queue", "Efficiently retrieve the highest- or lowest-priority item.", [["Kth largest element", "Find the kth largest value without sorting the entire array.", "https://leetcode.com/problems/kth-largest-element-in-an-array/"]]],
  ["Graphs", "Model relationships and explore them with BFS and DFS.", [["Number of islands", "Count connected groups of land in a grid.", "https://leetcode.com/problems/number-of-islands/"]]],
  ["Trie", "Represent prefixes efficiently for search and autocomplete.", [["Implement a Trie", "Build a prefix tree with insert and search.", "https://leetcode.com/problems/implement-trie-prefix-tree/"]]],
  ["Dynamic Programming", "Turn overlapping subproblems into efficient solutions.", [["Climbing stairs", "Count ways to reach the top with one- or two-step moves.", "https://leetcode.com/problems/climbing-stairs/"], ["House Robber", "Maximize value without choosing adjacent houses.", "https://leetcode.com/problems/house-robber/"]]]
];

async function upsertLessons(topic, rows) {
  for (const [order, [title, description, youtubeVideoId, duration]] of rows.entries()) {
    const slug = slugify(title);
    await Lesson.findOneAndUpdate(
      { topicId: topic._id, slug },
      { $set: { title, description, youtubeVideoId, youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`, duration, order, isPublished: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

async function upsertDsaLessons(topic, rows) {
  for (const [order, [title, description, problemUrl]] of rows.entries()) {
    const slug = slugify(title);
    await Lesson.findOneAndUpdate(
      { topicId: topic._id, slug },
      { $set: { title, description, problemUrl, order, isPublished: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

await connectDatabase();
try {
  const definitions = [
    { type: "mern", title: "MERN Stack", slug: "mern", description: "Go from your first line of HTML to shipping full-stack applications. One clear step at a time.", topics: mernTopics },
    { type: "dsa", title: "DSA with Java", slug: "dsa", description: "Build strong data structures and algorithms foundations, one concept at a time.", topics: dsaTopics }
  ];
  for (const [roadmapOrder, definition] of definitions.entries()) {
    const roadmap = await Roadmap.findOneAndUpdate(
      { type: definition.type },
      { $set: { title: definition.title, slug: definition.slug, description: definition.description, order: roadmapOrder, isPublished: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    for (const [order, [title, description, content]] of definition.topics.entries()) {
      const topic = await Topic.findOneAndUpdate(
        { roadmapId: roadmap._id, slug: slugify(title) },
        { $set: { title, description, order, isPublished: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      if (definition.type === "mern") await upsertLessons(topic, content);
      else await upsertDsaLessons(topic, content);
    }
  }
  if (seedAdminEmail && seedAdminPassword) {
    await seedAdmin(User, seedAdminEmail, seedAdminPassword);
    console.log("Administrator account created or updated.");
  }
  console.log("Roadmaps seeded successfully.");
} finally {
  await mongoose.disconnect();
}
