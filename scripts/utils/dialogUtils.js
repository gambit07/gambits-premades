import { AutomationDialog } from "../applications/automationDialog.js";

export function showAutomationDialog(options) {
  return AutomationDialog.wait(options);
}

export function confirmAutomationDialog(options) {
  return showAutomationDialog({
    ...options,
    buttons: [
      {action: "yes", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"), icon: "fas fa-check", ...options.yes, callback: async (...args) => options.yes?.callback ? options.yes.callback(...args) : true},
      {action: "no", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"), icon: "fas fa-times", default: true, ...options.no, callback: async (...args) => options.no?.callback ? options.no.callback(...args) : false}
    ]
  });
}

export async function showDialog({ title, message, image, buttons = [] }) {
  return showAutomationDialog({
    window: { title },
    content: `
      <div class="gps-dialog-container">
        <div class="gps-dialog-section">
          <div class="gps-dialog-content">
            <div class="gps-dialog-flex">
              <p class="gps-dialog-paragraph">${message}</p>
              ${image ? `<div class="gps-dialog-image-container"><img src="${image}" class="gps-dialog-image"></div>` : ""}
            </div>
          </div>
        </div>
      </div>
    `,
    buttons: buttons.map(btn => ({
      ...btn,
      callback: async (event, button, dialog) => {
        await btn.callback?.(event, button, dialog);
        return btn.action || btn.label;
      }
    })),
    rejectClose: false
  });
}
