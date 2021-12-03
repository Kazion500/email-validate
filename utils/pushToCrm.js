const { default: axios } = require("axios");

module.exports = async (data) => {
  const url = `https://rest.gohighlevel.com/v1/contacts/`;

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return { status: "response.data", email, ...rest };
  } catch (error) {
    throw new Error("Something went wrong:" + error.response.data);
  }
};
