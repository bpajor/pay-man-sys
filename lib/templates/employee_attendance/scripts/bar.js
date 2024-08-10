const weekProgress = (2 / 5) * 100;
const monthProgress = (4 / 30) * 100;
const overallProgress = (130 / 154) * 100;

// Set the width of the progress bar based on the progress value
const weekBar = document.getElementById("week-bar");
weekBar.style.width = weekProgress + "%";

const monthBar = document.getElementById("month-bar");
monthBar.style.width = monthProgress + "%";

const overallBar = document.getElementById("overall-bar");
overallBar.style.width = overallProgress + "%";