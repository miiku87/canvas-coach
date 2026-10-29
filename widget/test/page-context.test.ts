import { describe, expect, it } from "vitest";
import { detectPage } from "../src/page-context.js";

describe("detectPage", () => {
  it.each([
    ["/courses/12", { courseId: "12", pageType: "front_page", itemId: undefined, editing: false }],
    ["/courses/12/", { courseId: "12", pageType: "front_page", itemId: undefined, editing: false }],
    ["/courses/12/wiki", { courseId: "12", pageType: "front_page", itemId: undefined, editing: false }],
    ["/courses/12/assignments/syllabus", { courseId: "12", pageType: "syllabus", itemId: undefined, editing: false }],
    ["/courses/12/modules", { courseId: "12", pageType: "modules", itemId: undefined, editing: false }],
    ["/courses/12/pages/viikko-1", { courseId: "12", pageType: "wiki_page", itemId: "viikko-1", editing: false }],
    ["/courses/12/pages/viikko-1/edit", { courseId: "12", pageType: "wiki_page", itemId: "viikko-1", editing: true }],
    ["/courses/12/pages/%C3%A4%C3%A4", { courseId: "12", pageType: "wiki_page", itemId: "ää", editing: false }],
    ["/courses/12/assignments/345", { courseId: "12", pageType: "assignment", itemId: "345", editing: false }],
    ["/courses/12/assignments/345/edit", { courseId: "12", pageType: "assignment", itemId: "345", editing: true }],
    ["/courses/12/discussion_topics/9", { courseId: "12", pageType: "discussion", itemId: "9", editing: false }],
    ["/courses/12/quizzes/7/edit", { courseId: "12", pageType: "quiz", itemId: "7", editing: true }],
  ])("%s", (path, expected) => {
    expect(detectPage(path)).toEqual(expected);
  });

  it.each([
    "/",
    "/courses",
    "/courses/12/assignments",
    "/courses/12/assignments/345/submissions/3",
    "/courses/12/gradebook",
    "/courses/12/pages",
    "/profile",
  ])("ignores %s", (path) => {
    expect(detectPage(path)).toBeNull();
  });
});
