const express = require('express');
const mysql = require('mysql');
const fillData = require('./dataFloodingScript');

const app = express();
const port = 3000;

const totalSeats = {
  "H": 48,
  "E": 49,
  "G": 46,
  "B": 54,
  "I": 39,
  "C": 54,
  "J": 57,
  "D": 54,
  "A": 51,
  "F": 48,
}

// MySQL database configuration
const dbConfig = {
  host: 'flurnproject.mysql.database.azure.com',
  user: 'mravtechinfo',
  password: 'password2023#',
  database: 'assign'
};

// Create a MySQL pool
const connection = mysql.createPool(dbConfig);

const args = process.argv.slice(2);
console.log("args %j", args);

// CRUD
if (args[0] === 'fillData')
  fillData(connection);

// Middleware to parse JSON requests
app.use(express.json());

app.get('/seats', (req, res) => {
  res.json([
    { seatID: "xyz1", seatClass: "A", isBooked: false },
    { seatID: "xyz2", seatClass: "B", isBooked: true }
  ])
});


app.get('/seat/:id', (req, res) => {
  const id = req.params?.id;
  let isBooked;
  if (id == 5) {
    isBooked = true;
  }
  if (id == 4) {
    isBooked = false;
  }

  if (isBooked) {
    res.json(
      { seatID: "xyz1", seatClass: "A", isBooked: false, price: 5700 },
    )
  }
  else {
    res.json(
      { seatID: "xyz1", seatClass: "A", isBooked: false, price: 5700 },
    )
  }

});


app.get('/bookings', (req, res) => {
  const userEmail = req.query?.userIdentifier;

  if (userEmail === 'anubhav@gmail.com') {
    res.json([
      { seatID: "xyz1", seatClass: "A", price: 5700 },
      { seatID: "xyz1", seatClass: "A", price: 5700 },
    ])
  }
  else {
    res.json({
      success: false,
      message: "Email not found"
    })
  }

});

app.post('/booking', (req, res) => {
  const email = req.body.email;
  const seats = req.body.seats;

  connection.query('SELECT * FROM seats WHERE seatID in (?)', seats, (err, seatsData) => {
    if (err) {
      console.error('Error executing query:', err);
    } else {
      console.log('Data fetched successfully %j', seatsData)
      const resultData = [];
      let noneBooked = true;

      seatsData.forEach((element) => {
        if (element.booked === 1) {
          noneBooked = false;
        }
      });
      if (noneBooked) {
        // Find the booked seats for that class and total seats of that class 
        seatsData.forEach((element) => {
          connection.query('SELECT COUNT(*) as count FROM seats WHERE seatClass = ? and booked = 1', element?.seatClass, (err, countBooked) => {
            if (err) {
              console.error('Error executing query:', err);
            } else {
              console.log('countBooked fetched successfully %j', countBooked);
              let percentage = countBooked.count / totalSeats[element.seatClass];
              percentage = percentage * 100;

              connection.query('SELECT minPrice, normalPrice, maxPrice FROM seatPricing WHERE seatClass = ?', element?.seatClass, (err, pricing) => {
                if (err) {
                  console.error('Error executing query:', err);
                } else {
                  let price;
                  if (percentage < 40) {
                    if (pricing?.minPrice == null) {
                      price = pricing?.minPrice;
                    } else {
                      price = pricing.normalPrice;
                    }
                  } else if (percentage >= 40 && percentage < 60) {
                    if (pricing?.normalPrice == null) {
                      price = pricing?.maxPrice;
                    } else {
                      price = pricing.normalPrice;
                    }
                  } else {
                    if (pricing?.maxPrice == null) {
                      price = pricing?.normalPrice;
                    } else {
                      price = pricing.maxPrice;
                    }
                  }
                  connection.query('UPDATE seats SET booked = 1 WHERE seatID = ?', element?.seatID, (err, resultFinal) => {
                    if (err) {
                      console.error('Error executing query:', err);
                    } else {
                      console.log("Seat Booked finally");
                      resultData.push({
                        price: price,
                        seatID: element.seatID
                      });
                      return res.json({
                        success: true,
                        data: resultData
                      })
                    }
                  });
                }
              });
            }
          });

        });
       
      }
      else {
        res.json({
          success: false,
          message: "Sorry for inconvenience, Some seats were booked already"
        })
      }
    }
  });

});

const getByID = (data, dbConnection) => {
  return new Promise((resolve, reject) => {
    const sql = `some random shit`;

    connection.query(sql, jsonData, (err, results) => {
      connection.release(); // Release the connection

      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'Failed to execute query' });
      } else {
        res.json({ message: 'Data inserted successfully' });
      }
    });
  })
}
// Start the server after connecting to the database
connection.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    connection.release(); // Release the connection
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }
});

