const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

app.use(express.json());
app.use(cors({
    origin: [process.env.FRONTEND_URL], // Allow your frontend
    credentials: true
}));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGO_URI;
const PORT = process.env.PORT;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {

        const db = client.db("mediqueue-db");
        const tutorCollection = db.collection("tutors");
        const myTutorsCollection = db.collection("my-tutors");
        const myBookingCollection = db.collection("my-bookings");


        app.get('/feat-tutors', async (req, res) => {
            const result = await tutorCollection.find().limit(6).toArray();
            res.send(result);
        });

        app.get('/all-tutors', async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.send(result);
        });

        app.get('/all-tutors/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tutorCollection.findOne(query);
            res.send(result);
        });


        // get tutors added by me
        app.get('/my-tutors/:userId', async (req, res) => {
            const userId = req.params.userId;
            const result = await tutorCollection.find({userID: userId}).toArray();
            res.send(result);
        });

         // get tutors booked by me
        app.get('/my-bookings/:userId', async (req, res) => {
            const userId = req.params.userId;
            const result = await myBookingCollection.find({userId: userId}).toArray();
            res.send(result);
        });

        app.patch('/all-tutors/:id', async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            // console.log(req.body);
            const tutor = await tutorCollection.findOne({ _id: new ObjectId(id) });
            console.log(tutor);

            if (!tutor) {
                return res.status(404).send({ message: 'Tutor not found' });
            }

            if (tutor.remainingSlots <= 0) {
                return res.status(400).send({ message: 'No slots remaining' });
            }

            await tutorCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { remainingSlots: -1 } }
            );

            const result = await myBookingCollection.insertOne(update);

            res.send(result);
        });

        // for updating added tutor data by user
        app.patch('/my-tutors/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            console.log(updatedData);

            const result = await tutorCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData } );

            res.send(result);
        });

        app.post('/all-tutors', async (req, res) => {
            const tutorData = req.body;
            console.log(tutorData);
            tutorData.remainingSlots = parseInt(tutorData.remainingSlots, 10);
            const result = await tutorCollection.insertOne(tutorData);
            res.json(result);
        })

        app.delete('/my-tutors/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await tutorCollection.deleteOne(filter);
            res.json(result);
        });

        app.patch('/my-bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const update = { $set: { status: 'cancelled' } };
            const result = await myBookingCollection.updateOne(filter, update);
            res.send(result);
        });

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
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

    res.send('Hello from server');
    console.log('server is running, try a endpoint!')

});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));