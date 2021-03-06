const { default: axios } = require("axios");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3300;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("GET");
});

app.post("/", async (req, res) => {
  const { contact_id, email, tags } = req.body;
  const { apiKey } = req.query;
  console.log("REQUEST DATA", req.body);
  console.log("EMAIL", email);

  if (!apiKey || apiKey == "") {
    return res.status(400).json({ message: "`apiKey is required..`" });
  }

  if (!contact_id) {
    console.log("BAD REQUEST");
    return res.status(400).json({ message: "`contactId` is required" });
  }

  if (!email) {
    console.log("BAD REQUEST");
    return res.status(400).json({ message: "`Email` is required" });
  }

  const url = `https://client.myemailverifier.com/verifier/validate_single/${email}/QUSFSJfMuALrabfP`;

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-type": "application/json",
      },
    });
    // response = {
    //   data: {
    //     status: "passed",
    //     event: "mailbox_exists",
    //   },
    // };

    const newTags = tags.split(",");

    console.log("RESPONSE FROM BULK", response.data);
    if (response.data.Status.toLowerCase() === "valid") {
      console.log("PASSED...");
      const note = putNotesToGHL(contact_id, response.data.Diagnosis, apiKey);
      const contact = await putToGHL(
        contact_id,
        [...newTags, "validated"],
        apiKey
      );
      console.log("CONTACT: ", contact);

      return res.json({ contact, note });
    } else {
      console.log("EMAIL NOT VALID");
      const note = putNotesToGHL(contact_id, response.data.Diagnosis, apiKey);
      const contact = await putToGHL(contact_id, [...newTags,'validated'], apiKey);
      return res.status(200).json({ msg: "EMAIL NOT VALID", contact, note });
    }
  } catch (error) {
    console.log("No Email FOUND or Couldnt get the email");
    res.json({ error: "No Email FOUND" });
  }
});

async function putToGHL(contactId, tag, apiKey) {
  try {
    const url = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;
    const response = await axios.put(
      url,
      {
        tags: tag,
      },
      {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    console.log("PUT DATA: ", response.data);
    return response.data;
  } catch (error) {
    console.log("PUT CANT HAPPEN", error.response.data);
    return error.response.data;
  }
}

async function putNotesToGHL(contactId, note, apiKey) {
  try {
    const url = `https://rest.gohighlevel.com/v1/contacts/${contactId}/notes/`;
    const response = await axios.put(
      url,
      {
        body: note,
      },
      {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    console.log("PUT DATA: ", response.data);
    return response.data;
  } catch (error) {
    console.log("PUT CANT HAPPEN", error.response.data);
    return error.response.data;
  }
}

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
