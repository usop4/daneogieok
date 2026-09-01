const { test, expect } = require("@playwright/test");

async function answerColumnsWithKeyOne(page, count) {
  for (let i = 0; i < count; i += 1) {
    await page.keyboard.press("1");
  }
}

async function waitForQuiz01Or02Evaluation(page) {
  await page.waitForFunction(() => {
    const popup = document.querySelector("#correctPopup");
    const feedback = document.querySelector("#answerFeedback");
    const popupShown = Boolean(popup && popup.classList.contains("show"));
    const hasWrongFeedback = Boolean(feedback && /不正解/.test(feedback.textContent || ""));
    return popupShown || hasWrongFeedback;
  }, { timeout: 3000 });
}

async function reachQuiz01WrongAnswer(page, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const columnCount = await page.locator("#quizTable .hangulCell").count();
    await answerColumnsWithKeyOne(page, columnCount);
    await waitForQuiz01Or02Evaluation(page);

    const feedbackText = await page.locator("#answerFeedback").textContent();
    if ((feedbackText || "").includes("不正解")) {
      return true;
    }

    if (await page.locator("#correctPopup.show").count()) {
      await page.keyboard.press("Enter");
      await expect(page.locator("#quizTable .hangulCell").first()).toBeVisible();
    }
  }
  return false;
}

async function reachQuiz02WrongAnswer(page, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const columnCount = await page.locator("#quizTable .questionCell").count();
    await answerColumnsWithKeyOne(page, columnCount);
    await waitForQuiz01Or02Evaluation(page);

    const feedbackText = await page.locator("#answerFeedback").textContent();
    if ((feedbackText || "").includes("不正解")) {
      return true;
    }

    if (await page.locator("#correctPopup.show").count()) {
      await page.keyboard.press("Enter");
      await expect(page.locator("#quizTable .questionCell").first()).toBeVisible();
    }
  }
  return false;
}

test.describe("Quiz01/Quiz02 key and auto judge", () => {
  test("Quiz01 supports number key selection and auto judge", async ({ page }) => {
    await page.goto("/quiz01.html");
    await expect(page.locator("#quizTable .hangulCell").first()).toBeVisible();

    await page.keyboard.press("1");
    await expect(page.locator("#quizTable .cellBtn.selected")).toHaveCount(1);

    const columnCount = await page.locator("#quizTable .hangulCell").count();
    await answerColumnsWithKeyOne(page, columnCount - 1);
    await waitForQuiz01Or02Evaluation(page);

    await expect(page.locator("#statPill")).toContainText("正解=");
  });

  test("Quiz02 supports Enter to move to next question", async ({ page }) => {
    await page.goto("/quiz02.html");
    await expect(page.locator("#quizTable .questionCell").first()).toBeVisible();

    await page.keyboard.press("1");
    await expect(page.locator("#quizTable .cellBtn.selected")).toHaveCount(1);

    await page.keyboard.press("Enter");
    await expect(page.locator("#quizTable .cellBtn.selected")).toHaveCount(0);
  });

  test("Quiz01 highlights the correct option after a wrong answer", async ({ page }) => {
    await page.goto("/quiz01.html");
    await expect(page.locator("#quizTable .hangulCell").first()).toBeVisible();

    const sawWrongAnswer = await reachQuiz01WrongAnswer(page);
    expect(sawWrongAnswer).toBe(true);

    await expect(page.locator("#quizTable .cellBtn.correct")).not.toHaveCount(0);
    await expect(page.locator("#quizTable .cellBtn.wrong")).not.toHaveCount(0);
  });

  test("Quiz02 highlights the correct option after a wrong answer", async ({ page }) => {
    await page.goto("/quiz02.html");
    await expect(page.locator("#quizTable .questionCell").first()).toBeVisible();

    const sawWrongAnswer = await reachQuiz02WrongAnswer(page);
    expect(sawWrongAnswer).toBe(true);

    await expect(page.locator("#quizTable .cellBtn.correct")).not.toHaveCount(0);
    await expect(page.locator("#quizTable .cellBtn.wrong")).not.toHaveCount(0);
  });
});

test.describe("Quiz03/Quiz04 label visibility and result styles", () => {
  for (const quizPath of ["/quiz03.html", "/quiz04.html"]) {
    test(`${quizPath} shows an example in the hint only after answering`, async ({ page }) => {
      await page.route("**/quiz03-data.txt", (route) => route.fulfill({
        contentType: "text/plain; charset=utf-8",
        body: [
          "가다,行く,共通例文です。",
          "나다,出る,共通例文です。",
          "다다,届く,共通例文です。",
          "라다,言う,共通例文です。"
        ].join("\n")
      }));
      await page.goto(quizPath);
      await expect(page.locator("#choices .choice")).toHaveCount(4);
      await expect(page.locator("#hintText")).not.toContainText("共通例文です。");

      await page.keyboard.press("1");

      await expect(page.locator("#hintText")).toContainText("共通例文です。");
    });
  }

  test("Quiz03 reveals labels and marks correctness after answering", async ({ page }) => {
    await page.goto("/quiz03.html");
    await expect(page.locator("#choices .choice")).toHaveCount(4);
    await expect(page.locator("#choices .choice .hangul-label").first()).toBeHidden();

    await page.keyboard.press("1");

    await expect(page.locator("#choices .choice.revealed")).toHaveCount(4);
    await expect(page.locator("#choices .choice.correct")).toHaveCount(1);
    await expect(page.locator("#choices .choice .hangul-label").first()).toBeVisible();
  });

  test("Quiz04 reveals labels and marks correctness after answering", async ({ page }) => {
    await page.goto("/quiz04.html");
    await expect(page.locator("#choices .choice")).toHaveCount(4);
    await expect(page.locator("#choices .choice .hangul-label").first()).toBeHidden();

    await page.keyboard.press("1");

    await expect(page.locator("#choices .choice.revealed")).toHaveCount(4);
    await expect(page.locator("#choices .choice.correct")).toHaveCount(1);
    await expect(page.locator("#choices .choice .hangul-label").first()).toBeVisible();
  });
});
