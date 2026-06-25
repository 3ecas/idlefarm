import { addCoins, getPinnedMoneyPosition, isCellHidden, onStateChange, state } from "./state.js";

export function mountMoney(container) {
  container.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-coins]");
    if (!addButton) {
      return;
    }

    addCoins(100);
  });

  function render() {
    if (isCellHidden("money")) {
      container.innerHTML = "";
      return;
    }

    const position = getPinnedMoneyPosition();

    container.innerHTML = `
      <section class="money-cell" data-cell-key="money" data-money-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Money">
        <div class="money-header">
          <span class="money-title">
            <span class="money-title__icon" aria-hidden="true">🪙</span>
            <span class="money-title__text">Money</span>
          </span>
        </div>
        <div class="money-body">
          <span class="money-body__value">
            <span class="money-coin" aria-hidden="true"></span>
            <span class="money-value">${state.coins}</span>
          </span>
          <button type="button" class="money-add" data-add-coins aria-label="Add 100 coins">+</button>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
