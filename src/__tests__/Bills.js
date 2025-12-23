/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import mockStore from "../__mocks__/store";

jest.mock("../app/store", () => mockStore);
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    // Type de test: Intégration — utilise `router()` et la navigation; vérifie interaction router + UI
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList).toContain("active-icon");
    });
    // Type de test: Unitaire — teste `BillsUI({ data })` isolé et l'ordre d'affichage des dates
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    // Type de test: Intégration — démarre le `router()` et navigue vers Bills; vérifie la présence du bouton
    test("Then the 'New Bill' button should be present on the page", () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      const newBillButton = screen.getByTestId("btn-new-bill");
      expect(newBillButton).toBeTruthy();
    });

    // Intégration: soumission d'une nouvelle note de frais (fichier + fields)
    test("Then I can create a new bill via the NewBill form", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      // Render NewBill UI directly and instantiate container (avoids router timing)
      const NewBillUI = require("../views/NewBillUI.js").default;
      const NewBill = require("../containers/NewBill.js").default;
      document.body.innerHTML = NewBillUI();

      const store = mockStore;

      // spies on store methods
      const createSpy = jest.spyOn(store.bills(), "create");
      const updateSpy = jest.spyOn(store.bills(), "update");

      // instantiate NewBill container to bind handlers
      const onNavigate = jest.fn();
      new NewBill({ document, onNavigate, store, localStorage: window.localStorage });

      // simulate file upload
      const fileInput = screen.getByTestId("file");
      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => expect(createSpy).toHaveBeenCalled());

      // fill form and submit
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "ticket" } });
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "50" } });
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2021-01-01" } });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });

      const submitBtn = screen.getByText("Envoyer");
      fireEvent.click(submitBtn);

      await waitFor(() => expect(updateSpy).toHaveBeenCalled());

      expect(createSpy.mock.results[0].value).resolves.toHaveProperty("fileUrl");
    });
  });

  // Test d'intégration: simuler une erreur 404 renvoyée par l'API et vérifier l'affichage
  describe("When an error occurs on API for Bills page", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    // Type de test: Intégration — mock du store pour rejeter avec Error("Erreur 404") et vérification UI
    test("Then the Bills page should display error 404 when API fails", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });
    // Type de test: Intégration — mock du store pour rejeter avec Error("Erreur 500") et vérification UI
    test("Then the Bills page should display error 500 when API fails", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
