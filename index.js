const express = require("express");
const cors = require("cors");

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ChangeStream,
} = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

var admin = require("firebase-admin");

var serviceAccount = require("./assignment-11.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.vn802kt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware/auth.js
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    res.status(401).send("Unauthorized");
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("db_name");
    const foodsCollection = db.collection("collection");

    app.post("/add-food", async (req, res) => {
      const data = req.body;
      const result = await foodsCollection.insertOne(data);
      res.send(result);
    });
    app.get("/add-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    app.get("/available-food", async (req, res) => {
      const data = await foodsCollection
        .find({ status: "available" })
        .toArray();
      res.send(data);
    });

    app.get("/feature-food", async (req, res) => {
      const data = await foodsCollection
        .find({ status: "available" })
        .sort({ date: 1 })
        .limit(6)
        .toArray();
      res.send(data);
    });

    app.get("/my-food", verifyFirebaseToken, async (req, res) => {
      const query = { ownerEmail: req.firebaseUser.email };
      const data = await foodsCollection.find(query).toArray();
      res.send(data);
    });

    app.get("/details/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const data = await foodsCollection.findOne(query);
      res.send(data);
    });

    app.get("/request", verifyFirebaseToken, async (req, res) => {
      const email = req.firebaseUser.email;
      const query = { status: "requested", requestedBy: email };
      const requestedFoods = await foodsCollection.find(query).toArray();
      res.send(requestedFoods);
    });

    app.put("/add-food/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedFood = req.body;
      const updatedDoc = {
        $set: updatedFood,
      };

      const result = await foodsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.patch("/request/:id", verifyFirebaseToken, async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const data = await foodsCollection.updateOne(query, {
        $set: {
          status: "requested",
          requestedBy: req.firebaseUser.email,
        },
      });
      res.send(data);
    });

    //

    app.delete("/add-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    //

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", verifyFirebaseToken, async (req, res) => {
  console.log("done");
  console.log(req.firebaseUser);
  res.send("Server is running!");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
