const { default: axios } = require("axios");
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { VALID, INVALID } = require("./constants");
const fileUpload = require("express-fileupload");
const convert = require("./utils/convert");
const validateEmail = require("./utils/validateEmail");
const pushToCrm = require("./utils/pushToCrm");
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"));
app.set("view engine", "ejs");
app.use(fileUpload());

// TODO:
// push to crm
// - push contacts only with valid emails
// Email List Validation

// Login URL: https://app.emaillistvalidation.com/signin
// Username: hello@authorityentrepreneurs.com
// Password: DrunkenMonkey@2021
// convert();

app.get("/", async (req, res) => {
  const { token, status } = req.query;

  if (!token || token.includes('""'))
    return res.redirect("/error?reason=token is required");

  //get all contacts matching the query[valid,invalid]
  try {
    let users;
    const account = await prisma.account.findFirst({
      where: {
        locationId: token,
      },
    });
    if (!account) {
      return res.redirect("/error");
    }
    const userCount = await prisma.contact.findMany({
      where: {
        account: {
          locationId: token,
        },
      },
    });
    if (status == 0 || status == 1) {
      if (isNaN(parseInt(status))) {
        return res.status(400).json({ error: "`Token` is required" });
      }

      users = await prisma.contact.findMany({
        where: {
          status: status == 0 ? INVALID : status == 1 ? VALID : null,
          account: {
            locationId: token,
          },
        },
      });
    } else {
      users = await prisma.contact.findMany({
        where: {
          account: {
            locationId: token,
          },
        },
      });
    }

    const valid = userCount.filter(
      (email) => email.status.toLowerCase() == "valid"
    ).length;
    const inValid = userCount.filter(
      (email) => email.status.toLowerCase() == "invalid"
    ).length;

    return res.render("index", {
      users: users,
      count: users.length,
      valid,
      inValid,
      currentStatus: status == 0 ? INVALID : status == 1 ? VALID : "All",
      token,
      aid: account.id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/create", (req, res) => {
  res.render("create");
});

app.get("/error", (req, res) => {
  res.render("error");
});

// create contact in DB and update GHL
app.post("/", async (req, res) => {
  const { contact_id, email, tags, firstName, lastName } = req.body;
  const { token } = req.query;
  console.log("REQUEST DATA", req.body);
  console.log("EMAIL", email);

  if (!token || token == "") {
    return res.render("index", { error: "token is require" });
  }

  try {
    const response = await validateEmail({ email });

    console.log("RESPONSE FROM BULK", response);

    if (response.status.toLowerCase() !== "valid") {
      console.log("EMAIL NOT VALID");

      await createContact({
        email,
        firstName,
        lastName,
        status: "Invalid",
      });
    } else {
      await createContact({
        email,
        firstName,
        lastName,
        status: "Valid",
      });
    }
    return res.redirect("/");
  } catch (error) {
    console.log("No Email FOUND or Couldn't get the email");
    res.redirect("/");
  }
});

app.post("/create", async (req, res) => {
  const data = req.body;
  if (!data.name || !data.location) {
    return res.render("create", { error: "Error: All Fields are required" });
  }

  try {
    const account = await prisma.account.create({
      data: {
        apiKey: data.name,
        locationId: data.location,
      },
    });
    return res.redirect(`/?token=${account.locationId}`);
  } catch (error) {
    return res.render("create", { error: "Something Went Wrong" });
  }
});

app.post("/csv", async (req, res) => {
  const { lid, aid } = req.body;
  if (!lid || !aid) {
    return res.redirect("/error?token=token is required");
  }
  if (!req.files) {
    return res.redirect(`/?token=${lid}`);
  }

  if (!req.files.csv.mimetype.includes("csv")) {
    return res.redirect(`/?token=${lid}`);
  }

  const output = convert(req.files.csv.data);

  try {
    if (output.length) {
      const users = await Promise.all(
        output.map(async ({ email }) => {
          const e = await getUsers(email);
          if (!e && email) {
            const emails = await validateEmail({ email });
            return { ...emails, accountId: aid };
          } else {
            return "";
          }
        })
      );

      const filteredUsers = [...new Set(users)].filter((c) => c != "");
      console.log(filteredUsers);
      if (filteredUsers.length) {
        await createManyContact(filteredUsers);
      }

      return res.redirect(`/?token=${lid}&emails= ${filteredUsers.length}`);
    } else {
      return res.redirect(`/?token=${lid}&emails=0`);
    }
  } catch (error) {
    console.log("ERROR", error);
    return res.redirect(`/?token=${lid}&error=${error.message}`);
  }
});

app.post("/push", async (req, res) => {
  const { size } = req.query;
  const payload = {
    email: "john@deo.com",
    phone: "+18887324197",
    firstName: "John",
    lastName: "Deo",
    name: "John Deo",
    dateOfBirth: "1990-09-25",
    address1: "3535 1st St N",
    city: "Dolomite",
    state: "AL",
    country: "US",
    postalCode: "35061",
    companyName: "DGS VolMAX",
    website: "35061",
    tags: ["cupidatat do", "eu incididunt"],
    source: "public api",
    customField: {
      __custom_field_id__: "deserunt commodo incididunt labore",
    },
  };
  try {
    await pushToCrm(payload);
  } catch (error) {}
});

async function putToGHL(contactId, tag, token) {
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
          Authorization: `Bearer ${token}`,
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

async function putNotesToGHL(contactId, note, token) {
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
          Authorization: `Bearer ${token}`,
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

async function createContact(data) {
  try {
    const user = await prisma.contact.create({
      data,
    });
    return user;
  } catch (error) {
    throw new Error("Something went wrong");
  }
}

async function createManyContact(data) {
  try {
    const user = await prisma.contact.createMany({
      data,
    });
    return user;
  } catch (error) {
    console.log(error);
    throw new Error("Something went wrong");
  }
}

async function getUsers(email) {
  try {
    const user = await prisma.contact.findFirst({
      where: {
        email,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
    throw new Error("Something went wrong");
  }
}

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
