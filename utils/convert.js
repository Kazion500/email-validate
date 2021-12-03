const csvToJson = require("convert-csv-to-json");
const fs = require("fs");
const path = require("path");

module.exports = (csvFile) => {
  let contacts = [];
  if (!fs.existsSync("csv")) {
    fs.mkdirSync("csv");
  }
  fs.writeFileSync(path.join("csv", "users.csv"), csvFile);

  let json = csvToJson.getJsonFromCsv(path.join("csv", "users.csv"));

  for (let i = 0; i < json.length; i++) {
    contacts.push(json[i]);
  }
  return contacts;
};
