document.addEventListener("DOMContentLoaded", function () {
  const totalBalanceElement = document.getElementById("total-balance");
  const payrollsAmountElement = document.getElementById("payrolls-amount");
  const bonusesAmountElement = document.getElementById("bonuses-amount");
  const payrollsBar = document.querySelector(".payrolls-bar");
  const bonusesBar = document.querySelector(".bonuses-bar");

  const totalBalance = parseFloat(
    totalBalanceElement.textContent.replace(/[^0-9.-]+/g, "")
  );
  const payrollsAmount = parseFloat(
    payrollsAmountElement.textContent.replace(/[^0-9.-]+/g, "")
  );
  const bonusesAmount = parseFloat(
    bonusesAmountElement.textContent.replace(/[^0-9.-]+/g, "")
  );

  const payrollsPercentage = (payrollsAmount / totalBalance) * 100;
  const bonusesPercentage = (bonusesAmount / totalBalance) * 100;

  payrollsBar.style.width = payrollsPercentage + "%";
  bonusesBar.style.width = bonusesPercentage + "%";

  const presentSpendingsElement = document.querySelector(
    ".desc-item:nth-child(1) h3"
  );
  const targetElement = document.querySelector(".desc-item:nth-child(2) h3");

  // Przekształć ich wartości na liczby
  const presentSpendings = parseFloat(
    presentSpendingsElement.textContent.replace(/[^0-9.-]+/g, "")
  );
  const target = parseFloat(
    targetElement.textContent.replace(/[^0-9.-]+/g, "")
  );

  // Porównaj wartości i ustaw odpowiedni kolor
  if (presentSpendings < target) {
    presentSpendingsElement.style.color = "green";
  } else {
    presentSpendingsElement.style.color = "red";
  }
});
