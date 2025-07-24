const chalk = {
  yellow: (str) => str,
  green: (str) => str,
  blue: {
    bold: (str) => str,
  },
  bold: {
      blue: (str) => str,
  }
};

module.exports = chalk;
