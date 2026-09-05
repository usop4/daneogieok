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

async function pressCorrectQuiz03Or04Key(page, quizPath) {
  const prompt = await page.locator("#questionText").textContent();
  const answers = { "가다": "行く", "나다": "出る", "다다": "届く", "라다": "言う" };
  const correctValue = quizPath === "/quiz03.html"
    ? answers[prompt]
    : { "行く": "가다", "出る": "나다", "届く": "다다", "言う": "라다" }[prompt];
  const choiceTexts = await page.locator("#choices .choice-text").allTextContents();
  const correctIndex = choiceTexts.indexOf(correctValue);
  expect(correctIndex).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(correctIndex + 1));
}

async function setQuiz03Or04Fixture(page) {
  await page.route("**/quiz03-data.txt", (route) => route.fulfill({
    contentType: "text/plain; charset=utf-8",
    body: [
      "가다,行く",
      "나다,出る",
      "다다,届く",
      "라다,言う"
    ].join("\n")
  }));
}

test.describe("Quiz01/Quiz02 key and auto judge", () => {
  test("Quiz01 orders kanji options by occurrence frequency", async ({ page }) => {
    await page.route("**/quiz01-data.txt", (route) => route.fulfill({
      contentType: "text/plain; charset=utf-8",
      body: [
        "가나,甲乙",
        "가다,甲丙",
        "가라,甲丁",
        "가마,己戊"
      ].join("\n")
    }));
    await page.goto("/quiz01.html");

    await expect(page.locator("#quizTable .hangulCell").first()).toHaveText("가");
    await expect(page.locator('#quizTable .cellBtn[data-col="0"]')).toHaveText(["1. 甲", "2. 己"]);
  });

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

  for (const quizPath of ["/quiz03.html", "/quiz04.html"]) {
    test(`${quizPath} advances with Enter after a correct keyboard answer`, async ({ page }) => {
      await setQuiz03Or04Fixture(page);
      await page.goto(quizPath);
      await expect(page.locator("#choices .choice")).toHaveCount(4);
      const firstQuestion = await page.locator("#questionText").textContent();

      await pressCorrectQuiz03Or04Key(page, quizPath);
      await expect(page.locator("#choices .choice.correct")).toHaveCount(1);
      await page.keyboard.press("Enter");

      await expect(page.locator("#questionText")).not.toHaveText(firstQuestion || "");
    });

    test(`${quizPath} advances with Enter after an incorrect answer but not before answering`, async ({ page }) => {
      await setQuiz03Or04Fixture(page);
      await page.goto(quizPath);
      await expect(page.locator("#choices .choice")).toHaveCount(4);
      const firstQuestion = await page.locator("#questionText").textContent();
      await page.keyboard.press("Enter");
      await expect(page.locator("#questionText")).toHaveText(firstQuestion || "");

      const choiceTexts = await page.locator("#choices .choice-text").allTextContents();
      const correctText = quizPath === "/quiz03.html"
        ? { "가다": "行く", "나다": "出る", "다다": "届く", "라다": "言う" }[firstQuestion]
        : { "行く": "가다", "出る": "나다", "届く": "다다", "言う": "라다" }[firstQuestion];
      const wrongIndex = choiceTexts.findIndex((text) => text !== correctText);
      await page.keyboard.press(String(wrongIndex + 1));
      await expect(page.locator("#choices .choice.wrong")).toHaveCount(1);
      await page.keyboard.press("Enter");
      await expect(page.locator("#questionText")).not.toHaveText(firstQuestion || "");
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
