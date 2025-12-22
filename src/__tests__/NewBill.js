/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import NewBill from "../containers/NewBill.js";
import NewBillUI from "../views/NewBillUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the NewBill form should be rendered", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
    });
  });
  describe("When I click on 'Nouvelle note de frais' button from Bills page", () => {
    test("Then the NewBill form should be displayed", () => {
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
      // Render Bills UI and instantiate the container which binds the click handler
      document.body.innerHTML = BillsUI({ data: [] });
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      new Bills({ document, onNavigate, store: null, localStorage: window.localStorage });
      const newBillButton = screen.getByTestId("btn-new-bill");
      expect(newBillButton).toBeTruthy();
      userEvent.click(newBillButton);
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });
  });

  describe("When I try to submit a new bill without a justificatif (file)", () => {
    test("Then submission should be prevented and form invalid", () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
      const html = NewBillUI();
      document.body.innerHTML = html;
      const onNavigate = jest.fn();
      // instantiate container to bind submit handler
      new Bills({ document, onNavigate, store: null, localStorage: window.localStorage });
      // fill other required fields except the file input
      const expenseName = screen.getByTestId("expense-name");
      const datepicker = screen.getByTestId("datepicker");
      const amount = screen.getByTestId("amount");
      const pct = screen.getByTestId("pct");
      userEvent.type(expenseName, "Repas client");
      // date input: set value directly
      datepicker.value = "2023-12-01";
      amount.value = "100";
      pct.value = "20";
      const form = screen.getByTestId("form-new-bill");
      const submitBtn = screen.getByText("Envoyer");
      // the file input is required in the UI
      const fileInput = screen.getByTestId("file");
      expect(fileInput).toBeTruthy();
      expect(fileInput.required).toBeTruthy();
      // form validity should be false because file is missing
      expect(form.checkValidity()).toBe(false);
      // Try to submit
      userEvent.click(submitBtn);
      // onNavigate should not have been called because submission is prevented
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("When a file is selected in the file input", () => {
    test("Then handleChangeFile should be called when a file is selected", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ email: "a@a", type: "Employee" }));

      const html = NewBillUI();
      document.body.innerHTML = html;

      const onNavigate = jest.fn();

      const store = mockStore;

      // spy on store.create to assert it is called by handleChangeFile
      const createSpy = jest.spyOn(store.bills(), "create");

      // instantiate NewBill container (this binds the change handler)
      new (require("../containers/NewBill.js").default)({ document, onNavigate, store, localStorage: window.localStorage });

      const fileInput = screen.getByTestId("file");
      const file = new File(["dummy content"], "test.png", { type: "image/png" });

      // userEvent.upload will set the files and fire the change event
      userEvent.upload(fileInput, file);

      await waitFor(() => expect(createSpy).toHaveBeenCalled());

      createSpy.mockRestore();
    });
  });

  describe("When I submit the new bill form with a valid file and fields", () => {
    test("Then the form should be submitted and the bill created", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ email: "a@a", type: "Employee" }));

      const html = NewBillUI();
      document.body.innerHTML = html;

      const onNavigate = jest.fn();
      const store = mockStore;

      // Spy update and create
      const updateSpy = jest.spyOn(store.bills(), "update");
      const createSpy = jest.spyOn(store.bills(), "create");

      // instantiate NewBill container
      new NewBill({ document, onNavigate, store, localStorage: window.localStorage });

      // upload a valid file first (png)
      const fileInput = screen.getByTestId("file");
      const file = new File(["dummy content"], "receipt.png", { type: "image/png" });
      userEvent.upload(fileInput, file);

      // wait for create to be called by handleChangeFile
      await waitFor(() => expect(createSpy).toHaveBeenCalled());

      // fill remaining fields
      userEvent.type(screen.getByTestId("expense-name"), "Repas client");
      screen.getByTestId("datepicker").value = "2023-12-01";
      screen.getByTestId("amount").value = "150";
      screen.getByTestId("pct").value = "20";

      const submitBtn = screen.getByText("Envoyer");
      userEvent.click(submitBtn);

      // onNavigate should have been called to go back to Bills
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills);

      // update should be called to save the bill
      await waitFor(() => expect(updateSpy).toHaveBeenCalled());

      createSpy.mockRestore();
      updateSpy.mockRestore();
    });
  });
});
