const { default: axios } = require("axios");

module.exports = async ({ email, ...rest }) => {
  const url = `https://app.emaillistvalidation.com/api/verifEmail?secret=OOnuwpNGpf66G1FmLCwqQ&email=${email}`;
  try {
    // const response = await axios.post(url, {
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    // });
    // const data = response.data;
    return { status: setStatus("data".toLowerCase()), email };
  } catch (error) {
    throw new Error("Something went wrong:" + error.response.data);
  }
};

function setStatus(status) {
  switch (status) {
    case "ok":
      // case status.includes("ok_for_all|ok_for_all", 0):
      return "Valid";
    default:
      return "Invalid";
  }
}
