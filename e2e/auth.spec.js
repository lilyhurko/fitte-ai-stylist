const { test, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
require("../server/tests/helpers/testEnvironment");

const { prisma } = require("../server/config/prisma");

test.describe("pełny przepływ autoryzacji", () => {
  const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const email = `e2e-${uniquePart}@example.com`;
  const password = "BezpieczneHaslo123!";
  test.afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await prisma.event.deleteMany({
        where: { userId: user.id },
      });
      await prisma.outfitRecommendation.deleteMany({
        where: { userId: user.id },
      });

      await prisma.analysis.deleteMany({
        where: { userId: user.id },
      });
      await prisma.clothDraft.deleteMany({
        where: { userId: user.id },
      });

      await prisma.cloth.deleteMany({
        where: { userId: user.id },
      });

      await prisma.user.deleteMany({
        where: { id: user.id },
      });
    }

    await prisma.$disconnect();
  });

  test("rejestracja, wylogowanie i ponowne logowanie", async ({ page }) => {
    await page.goto("/register");

    await page.getByPlaceholder("Twoje imię").fill("Użytkownik E2E");

    await page.getByPlaceholder("twoj@email.com").fill(email);

    await page.getByPlaceholder("Min. 6 znaków").fill(password);

    await page
      .getByRole("button", {
        name: "Zarejestruj się",
      })
      .click();

    await expect(page).toHaveURL("/");

    await expect(
      page.getByRole("button", {
        name: "Generuj propozycje",
      }),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: "Wyloguj się",
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Zaloguj się",
      }),
    ).toBeVisible();

    await page.goto("/login");

    await page.getByPlaceholder("twoj@email.com").fill(email);

    await page.getByPlaceholder("••••••••").fill(password);

    await page
      .getByRole("button", {
        name: "Zaloguj się",
      })
      .click();

    await expect(page).toHaveURL("/");

    await expect(
      page.getByRole("button", {
        name: "Generuj propozycje",
      }),
    ).toBeVisible();
    await page.goto("/wardrobe");

    await expect(
      page.getByRole("heading", {
        name: /Moja Garderoba/,
      }),
    ).toBeVisible();

    const addClothesButton = page.getByRole("button", {
      name: "Dodaj ubranie",
    });

    await addClothesButton.click();

    const addItemDialog = page.getByRole("dialog", {
      name: "Dodaj ubranie do garderoby",
    });
    const closeAddItemButton = addItemDialog.getByRole("button", {
      name: "Zamknij",
    });
    const filePickerButton = addItemDialog.getByRole("button", {
      name: "Wybierz zdjęcie ubrania",
    });
    const manualAddButton = addItemDialog.getByRole("button", {
      name: "Dodaj ręcznie bez zdjęcia",
    });

    await expect(addItemDialog).toBeVisible();
    await expect(closeAddItemButton).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(filePickerButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(manualAddButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeAddItemButton).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(manualAddButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(addItemDialog).toBeHidden();
    await expect(addClothesButton).toBeFocused();

    await addClothesButton.click();

    await page
      .locator('input[type="file"]')
      .setInputFiles("client/public/icon-192.png");

    await page
      .getByRole("button", {
        name: "Analizuj z Fitte AI",
      })
      .click();

    await expect(page.getByLabel("Nazwa")).toHaveValue("Koszula testowa E2E");

    await page
      .getByRole("button", {
        name: "Dodaj do szafy",
      })
      .click();

    await expect(
      page.getByText("Koszula testowa E2E", {
        exact: true,
      }),
    ).toBeVisible();

    const editClothesButton = page.getByTitle("Edytuj ubranie").first();
    await editClothesButton.click();

    const editItemDialog = page.getByRole("dialog", {
      name: "Edytuj ubranie",
    });
    const closeEditItemButton = editItemDialog.getByRole("button", {
      name: "Zamknij edycję ubrania",
    });
    const saveEditItemButton = editItemDialog.getByRole("button", {
      name: "Zapisz zmiany",
    });

    await expect(editItemDialog).toBeVisible();
    await expect(closeEditItemButton).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(saveEditItemButton).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(editItemDialog).toBeHidden();
    await expect(editClothesButton).toBeFocused();

    const recommendationUser = await prisma.user.findUnique({
      where: { email },
    });

    assert.ok(recommendationUser);

    await prisma.cloth.createMany({
      data: [
        {
          name: "Spodnie testowe E2E",
          category: "Dół",
          color: "czarny",
          style: "Classic",
          materials: ["COTTON"],
          seasons: ["SPRING", "AUTUMN"],
          warmthLevel: 3,
          waterResistance: "NONE",
          formality: "FORMAL",
          pattern: "SOLID",
          imageUrl: "http://127.0.0.1:5173/icon-192.png",
          userId: recommendationUser.id,
        },
        {
          name: "Buty testowe E2E",
          category: "Obuwie",
          color: "czarny",
          style: "Classic",
          materials: ["LEATHER"],
          seasons: ["SPRING", "AUTUMN"],
          warmthLevel: 3,
          waterResistance: "WATER_REPELLENT",
          formality: "FORMAL",
          pattern: "SOLID",
          imageUrl: "http://127.0.0.1:5173/icon-192.png",
          userId: recommendationUser.id,
        },
      ],
    });

    // Ubrania dodane bezpośrednio do testowej bazy nie trafiają do stanu React.
    // Ponowne wejście do Szafy odświeża kontekst przed generowaniem propozycji.
    await page.goto("/wardrobe");
    await expect(
      page.getByText("Buty testowe E2E", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Asystent" }).click();

    await page
      .getByRole("button", {
        name: "Praca",
      })
      .click();

    await page
      .getByPlaceholder(
        "Opisz szczegóły (np. idę na kolację, chcę czuć się swobodnie)...",
      )
      .fill("Potrzebuję formalnego zestawu do pracy");

    await page
      .getByRole("button", {
        name: "Generuj propozycje",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Która propozycja najlepiej pasuje do Ciebie?",
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Źródła propozycji są celowo ukryte", {
        exact: false,
      }),
    ).toBeVisible();

    await expect(page.getByRole("article")).toHaveCount(3);

    const generatedAnalysis = await prisma.analysis.findFirst({
      where: { userId: recommendationUser.id },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(generatedAnalysis);
    assert.ok(Array.isArray(generatedAnalysis.comparisonOrder));

    const fitteProposalIndex =
      generatedAnalysis.comparisonOrder.indexOf("fitte");
    assert.notEqual(fitteProposalIndex, -1);

    const fitteLikeButton = page.getByRole("button", {
      name: `Polub Propozycja ${String.fromCharCode(65 + fitteProposalIndex)}`,
    });

    await fitteLikeButton.click();

    await expect(fitteLikeButton).toBeDisabled();

    await page.goto("/calendar");

    await expect(
      page.getByRole("heading", {
        name: /Planer Okazji i Stylizacji/,
      }),
    ).toBeVisible();

    await page
      .getByPlaceholder("np. Obrona pracy magisterskiej")
      .fill("Obrona testowa E2E");

    await page.locator('input[type="datetime-local"]').fill("2030-06-15T12:00");

    await page.locator("select").nth(0).selectOption("Praca");

    await page.locator("select").nth(1).selectOption("Formal");

    await page
      .getByRole("button", {
        name: "Dodaj do planu",
      })
      .click();

    await expect(page.getByText("Obrona testowa E2E")).toBeVisible();

    const databaseUser = await prisma.user.findUnique({
      where: { email },
    });

    assert.ok(databaseUser);

    const databaseRecommendation = await prisma.outfitRecommendation.findFirst({
      where: {
        userId: databaseUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    assert.ok(databaseRecommendation);
    assert.equal(databaseRecommendation.status, "LIKED");
    assert.equal(databaseRecommendation.clothIds.length, 3);
    assert.ok(databaseRecommendation.analysisId);

    const databaseAnalysis = await prisma.analysis.findFirst({
      where: {
        id: databaseRecommendation.analysisId,
        userId: databaseUser.id,
      },
    });

    assert.ok(databaseAnalysis);
    assert.equal(databaseAnalysis.fitteScore, 1);

    const databaseCloth = await prisma.cloth.findFirst({
      where: {
        userId: databaseUser.id,
        name: "Koszula testowa E2E",
      },
    });

    assert.ok(databaseCloth);
    assert.equal(databaseCloth.category, "Góra");
    assert.equal(databaseCloth.style, "Classic");
    assert.equal(databaseCloth.color, "biały");
    assert.deepEqual(databaseCloth.materials, ["COTTON"]);
    assert.equal(databaseCloth.formality, "FORMAL");
    const databaseEvent = await prisma.event.findFirst({
      where: {
        userId: databaseUser.id,
        title: "Obrona testowa E2E",
      },
    });

    assert.ok(databaseEvent);
    assert.equal(databaseEvent.occasion, "Praca");
    assert.equal(databaseEvent.formality, "Formal");
    assert.equal(databaseEvent.timezone, "Europe/Warsaw");
  });
});
