require('dotenv').config();
const express = require('express');
const cors = require('cors');



const port = process.env.PORT || 5000;

const app = express();



app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3jkraio.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const roleCollection = client.db('studyZone').collection('role');
    const sessionCollection = client.db('studyZone').collection('sessionCollection');


    await client.connect();
    //  for role
    app.post('/role', async (req, res) => {

      const role = req.body;

      const query = { email: role.email }
      const existingUser = await roleCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'users already exist', insertedId: null })
      }

      const result = await roleCollection.insertOne(role);
      res.send(result);
    })


    // teacher 
    app.get('/user/teacher/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await roleCollection.findOne(query);
      let teacher = false;
      if (user) {
        teacher = user?.role === 'teacher'
      }
      res.send({ teacher });
    });


    app.post('/addSession', async (req, res) => {
      const data = req.body;
      const result = await sessionCollection.insertOne(data);
      res.send(result);
    });


    // admin server

    app.put('/users/role/:id', async (req, res) => {
      const userData = req.body;
      console.log(userData)
      const id = req.params.id;
      console.log(id, userData.role)
      const query = { _id: new ObjectId(id) };
      
      const updatedDoc = {
        $set: {
          role: userData.role
        }
      }
      const result = await roleCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.get('/user/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await roleCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin });
    });


    app.get('/all-role', async (req, res) => {
      const result = await roleCollection.find().toArray();
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello from scollaborative study server ....')
})
app.listen(port, () => console.log(`server running on port : ${port}`))