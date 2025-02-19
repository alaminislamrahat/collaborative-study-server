require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

const app = express();

//rahat change

app.use(cors({
  origin: ['http://localhost:5173',
    'https://collaborative-study-plat-ad204.web.app',
    'https://collaborative-study-plat-ad204.firebaseapp.com'


  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'], // Add methods you need
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionSuccessStatus: 200
}));
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
    const materialCollection = client.db('studyZone').collection('materialCollection');
    const bookingCollection = client.db('studyZone').collection('bookingCollection');
    const paymentCollection = client.db('studyZone').collection('paymentCollection');
    const reviewCollection = client.db('studyZone').collection('reviewCollection');
    const noteCollection = client.db('studyZone').collection('noteCollection');
    const rejectionReasonCollection = client.db('studyZone').collection('rejectionReasonCollection');


    // await client.connect();

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token })
    })


    const verifyToken = (req, res, next) => {
      // console.log('inside middle ware', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorize access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorize access' })
        }
        req.decoded = decoded;
        // console.log(decoded,'decoded',req.decoded ,'req decoded')
        next();
      })
    }

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

    app.get('/tutor', async (req, res) => {
      const result = await roleCollection.find().toArray();
      res.send(result);
    })


    app.get('/profile/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await roleCollection.findOne(query);
      res.send(result)
    })



    // booking collection 
    app.post('/booking', async (req, res) => {
      const data = req.body;
      const id = data.studySessionId;
      const query = { studySessionId: id };
      const isExit = await bookingCollection.findOne(query);
      if (isExit) {
        return res.send({ message: 'all Ready exist' })
      }
      const result = await bookingCollection.insertOne(data);
      res.send(result);
    })

    // student ----------------

    // matereial 

    app.get('/all-material-student', verifyToken, async (req, res) => {
      const sessionId = req.query.sessionId;
      const query = { studySessionId: sessionId };
      const result = await materialCollection.find(query).toArray();
      res.send(result);
    })

    //note

    app.post('/note-student', async (req, res) => {
      const data = req.body;
      const result = await noteCollection.insertOne(data);
      res.send(result);
    })

    app.get('/note-student', verifyToken, async (req, res) => {
      const email = req.query.email
      const result = await noteCollection.find({ email: email }).toArray();
      res.send(result);
    })

    app.get('/note-student/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await noteCollection.findOne(query);
      res.send(result);
    })

    app.put('/note-update-student/:id', async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      console.log(data, id)
      const query = { _id: new ObjectId(id) };
      console.log(query, id)
      const updatedDoc = {
        $set: {
          email: data.email,
          title: data.title,
          description: data.description
        }
      }
      const result = await noteCollection.updateOne(query, updatedDoc);
      res.send(result);
    });


    app.delete('/note-delete-student/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await noteCollection.deleteOne(query);
      res.send(result);
    })

    // review 

    app.get('/review', verifyToken, async (req, res) => {
      const id = req.query.id;
      console.log(id)
      const query = { sessionId: id }
      const result = await reviewCollection.find(query).toArray();
      console.log(result)
      res.send(result);
    })

    app.post('/reviews', async (req, res) => {
      const data = req.body;
      const result = await reviewCollection.insertOne(data);
      res.send(result);
    })

    app.get('/view/booked/session', verifyToken, async (req, res) => {
      const email = req.query.email;

      const result = await bookingCollection.find({ studentEmail: email }).toArray();
      res.send(result);
    })


    app.get('/user/student/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await roleCollection.findOne(query);
      let teacher = false;
      if (user) {
        student = user?.role === 'student'
      }
      res.send({ student });
    });

    // Endpoint to get paginated session cards
    app.get('/all-session-card', async (req, res) => {
      const size = parseInt(req.query.size) || 10; // Default size: 10
      const page = (parseInt(req.query.page) - 1) || 0; // Default page: 1
      const search = req.query.search;

      let query = {};
      if (search) {
        query = {
          sessionTitle: { $regex: search, $options: 'i' }
        };
      }

      try {
        const result = await sessionCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();

        res.send(result);
      } catch (error) {
        console.error('Error fetching session cards:', error);
        res.status(500).send({ error: 'Failed to fetch session cards.' });
      }
    });

    // Endpoint to count session cards
    app.get('/session-count', async (req, res) => {
      const search = req.query.search;

      let query = {};
      if (search) {
        query = {
          sessionTitle: { $regex: search, $options: 'i' }
        };
      }

      try {
        const count = await sessionCollection.countDocuments(query);
        res.send({ count });
      } catch (error) {
        console.error('Error counting sessions:', error);
        res.status(500).send({ error: 'Failed to count sessions.' });
      }
    });


    app.get('/detail/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.findOne(query);
      res.send(result);
    })


    // teacher --------------
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


    app.get('/session/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.findOne(query);
      // console.log(result)
      res.send(result)
    });


    app.delete('/session/delete/tutor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.deleteOne(query);
      res.send(result)
    })


    app.put('/update/session/:id', async (req, res) => {
      const data = req.body;
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...data
        }
      };
      const result = await sessionCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.get('/allSession/tutor', verifyToken, async (req, res) => {
      const email = req.query.email
      // console.log(email)
      const result = await sessionCollection.find({
        tutorEmail: email
      }).toArray();

      res.send(result);
    });


    // materila 

    app.post('/upload/material', async (req, res) => {
      const data = req.body;
      const result = await materialCollection.insertOne(data);
      res.send(result);
    })

    app.get('/allMaterial', verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await materialCollection.find({ tutorEmail: email }).toArray();
      res.send(result)
    });

    app.get('/material/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await materialCollection.findOne(query);
      res.send(result);
    })

    app.put('/update/material/:id', async (req, res) => {
      const material = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...material
        }
      }

      const result = await materialCollection.updateOne(query, updatedDoc);
      res.send(result);

    })



    // admin server--------------
    app.get('/admin-stats', async (req, res) => {
      const users = await roleCollection.estimatedDocumentCount();
      const review = await reviewCollection.estimatedDocumentCount();
      const session = await sessionCollection.estimatedDocumentCount();
      const matereial = await materialCollection.estimatedDocumentCount();
      const booking = await bookingCollection.estimatedDocumentCount();

      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$amount'
            }
          }
        },
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({ users, review, session, revenue, matereial, booking })
    })



    app.get('/student-stats/:email', async (req, res) => {
      const email = req.params.email;
      const result = await paymentCollection.aggregate([
        {
          $group: {
            email: email,
            totalRevenue: {
              $sum: '$amount'
            }
          }
        },
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;
      res.send({ revenue })
    })

    app.put('/users/role/:id', async (req, res) => {
      const userData = req.body;
      // console.log(userData)
      const id = req.params.id;
      // console.log(id, userData.role)
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



    // rejection 

    app.post('/rejection/reason', async (req, res) => {
      const data = req.body;
      const result = await rejectionReasonCollection.insertOne(data);
      res.send(result);
    })


    app.get('/rejection/reason/:id', async (req, res) => {
      const id = req.params.id;
      const query = { sessionId: id };
      const result = await rejectionReasonCollection.findOne(query);
      res.send(result)
    })

    app.delete('/reject/reason/:id', async (req, res) => {
      const id = req.params.id;

      const query = { sessionId: id };
      const result = await rejectionReasonCollection.deleteOne(query);
      res.send(result);
    })


    app.get('/all-role', verifyToken, async (req, res) => {

      const search = req.query.search;
      // console.log(search)
      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const result = await roleCollection.find(query).toArray();
      res.send(result);
    });


    app.get('/allSession/admin', async (req, res) => {

      const result = await sessionCollection.find().toArray();
      res.send(result);
    })

    app.put('/status/:id', async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: data.status,
          registrationFee: data.registrationFee

        }
      };

      const result = await sessionCollection.updateOne(query, updatedDoc);
      res.send(result);
    });


    app.get('/session/admin/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.findOne(query);
      // console.log(result)
      res.send(result)
    });


    app.delete('/session/delete/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.deleteOne(query);
      res.send(result)
    })


    app.put('/update/session/admin/:id', async (req, res) => {
      const data = req.body;
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...data
        }
      };
      const result = await sessionCollection.updateOne(query, updatedDoc);
      res.send(result);
    })


    app.get('/allMaterial/admin', verifyToken, async (req, res) => {

      const result = await materialCollection.find().toArray();
      res.send(result)
    });


    // payment -------------
    app.get('/session/payment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.findOne(query);
      res.send(result)
    })
    // strip payment information
    app.post('/stripe-payment', async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100);
      // console.log('payment ammount', amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    app.post('/payment-intent', async (req, res) => {
      const data = req.body;
      const result = await paymentCollection.insertOne(data);
      res.send(result);
    })

    app.get('/payment-intent/:id', async (req, res) => {
      const id = req.params.id;
      const query = { sessionId: id }
      const result = await paymentCollection.findOne(query);
      res.send(result);
    })

    // delete for both teacher and admin 
    app.delete('/delete/material/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await materialCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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