const express = require('express');
const app = express();
const PORT = 5000;

app.use(express.json());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/', (req, res) => {

    // res.json({ message: 'Hello from server' });
    console.log('server is running, try a endpoint!')

});
