const { test, expect } = require("@playwright/test");

const quizPages = [
  { path: "/quiz01.html", title: "Quiz01", questionSelector: "#quizTable .hangulCell" },
  { path: "/quiz02.html", title: "Quiz02", questionSelector: "#quizTable .questionCell" },
  { path: "/quiz03.html", title: "Quiz03", questionSelector: "#questionText" },
  { path: "/quiz04.html", title: "Quiz04", questionSelector: "#questionText" }
];

for (const quiz of quizPages) {
  test(`${quiz.title} renders question and choices`, async ({ page }) => {
    await page.goto(quiz.path);
    await expect(page).toHaveTitle(new RegExp(quiz.title));
    await expect(page.locator(quiz.questionSelector).first()).toBeVisible();
    await expect(page.locator(".quiz-nav a")).toHaveCount(4);

    if (quiz.title === "Quiz01" || quiz.title === "Quiz02") {
      await expect(page.locator("#quizTable .cellBtn:not(.dummy)").first()).toBeVisible();
    } else {
      await expect(page.locator("#choices .choice").first()).toBeVisible();
    }
  });
}
