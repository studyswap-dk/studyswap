// The two students every integration test can use. The addresses are the fixed
// ones from "Test data" in AGENTS.md. The ids are fixed, so a test can use them
// without looking them up.

export const student = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test Student",
  email: "202412345@post.au.dk",
};

export const otherStudent = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Test Student Two",
  email: "202412346@post.au.dk",
};

export const testUsers = [student, otherStudent];
