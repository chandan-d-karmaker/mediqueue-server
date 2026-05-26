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

        app.post('/my-tutors', async (req, res) => {
            const tutor = req.body;
            const result = await myTutorsCollection.insertOne(tutor);
            res.send(result);
        });

        app.get('/my-tutors', async (req, res) => {
            const result = await myTutorsCollection.find().toArray();
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

            const result = await myTutorsCollection.insertOne({ ...update });

            res.send(result);
        });

        app.delete('/my-tutors/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await myTutorsCollection.deleteOne(filter);
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