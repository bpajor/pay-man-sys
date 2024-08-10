const dateRanges = [
    "01 January - 31 January 2024",
    "01 February - 29 February 2024",
    "01 March - 31 March 2024",
    "01 April - 30 April 2024",
    "01 May - 31 May 2024",
    "01 June - 30 June 2024",
    "01 July - 31 July 2024",
  ];

  let currentIndex = 0;

  function updateDateText() {
    const dateText = document.getElementById("date-text");
    dateText.textContent = dateRanges[currentIndex];
  }

  function prevMonth() {
    if (currentIndex > 0) {
      currentIndex--;
      updateDateText();
    }
  }

  function nextMonth() {
    if (currentIndex < dateRanges.length - 1) {
      currentIndex++;
      updateDateText();
    }
  }