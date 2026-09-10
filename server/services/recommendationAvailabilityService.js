function getRecommendationAvailability(candidateCount) {
  if (candidateCount <= 0) {
    return {
      status: "NONE",
      message:
        "Brak zestawu spełniającego aktualne kryteria pogody, okazji i jakości.",
    };
  }

  if (candidateCount === 1) {
    return {
      status: "SINGLE",
      message:
        "Twoja garderoba pozwala obecnie utworzyć tylko jeden zestaw spełniający aktualne kryteria. Dodaj więcej pasujących ubrań, aby zwiększyć różnorodność propozycji.",
    };
  }

  return {
    status: "MULTIPLE",
    message: null,
  };
}

module.exports = {
  getRecommendationAvailability,
};