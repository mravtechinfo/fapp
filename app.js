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
  host: '127.0.0.1',
  user: 'root',
  password: '6789',
  database: 'flurnAssignment'
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
  connection.query(`SELECT seatID, seatClass, 
    CASE
        WHEN booked = 1 THEN 'YES'
        ELSE 'NO'
      END AS booked_status
    FROM flurnAssignment.seats 
    ORDER BY seatClass`, (err, seatsData) => {
    if (err) {
      console.error('Error executing query:', err);
      res.json({
        success: false,
        message: "Some error occurred"
      })
    } else {
      // console.log('Data fetched successfully %j', seatsData);
      res.json(seatsData)
    }
  })
});

app.get('/seat/:id', (req, res) => {
  const seatID = req.params?.id;

  connection.query(`SELECT seatID, seatClass, booked
    FROM flurnAssignment.seats 
    WHERE seatID = ?`, seatID, async (err, seatData) => {
    if (err) {
      console.error('Error executing query:', err);
      res.json({
        success: false,
        message: "Some error occurred"
      })
      return;
    } else {
      console.log('Data fetched successfully %j', seatData);
      if (seatData[0].booked === 1) {
        connection.query(`SELECT price 
        FROM flurnAssignment.booking 
        WHERE seatID = ?`, seatID, (err, pricing) => {
          if (err) {
            console.error('Error executing query:', err);
            res.json({
              success: false,
              message: "Some error occurred"
            })
            return;
          } else {
            res.json({
              seatID: seatData[0].seatID,
              seatClass: seatData[0].seatClass,
              price: pricing[0].price
            })
          }
        })
      } else {
        const countBooked = await getCountBookedForClass(seatData[0].seatClass);
        let percentage = countBooked.count / totalSeats[seatData[0].seatClass];
        percentage = percentage * 100;
        const pricing = await getPriceByClass(seatData[0].seatClass);
        let price;
        if (percentage < 40) {
          if (pricing[0]?.minPrice === null) {
            price = pricing[0]?.normalPrice;
          } else {
            price = pricing[0].minPrice;
          }
        } else if (percentage >= 40 && percentage < 60) {
          if (pricing[0]?.normalPrice === null) {
            price = pricing[0]?.maxPrice;
          } else {
            price = pricing[0].normalPrice;
          }
        } else {
          if (pricing[0]?.maxPrice === null) {
            price = pricing[0]?.normalPrice;
          } else {
            price = pricing[0].maxPrice;
          }
        }
        console.log("pricing %j", price)
        res.json({
          seatID: seatData[0].seatID,
          seatClass: seatData[0].seatClass,
          price: price
        })
      }
    }
  });
});


app.get('/bookings', (req, res) => {
  const userEmail = req.query?.userIdentifier;
  connection.query(`SELECT emailID, seatID, price
  FROM flurnAssignment.booking
  WHERE emailID = ? 
  ORDER BY emailID`, userEmail, (err, bookingData) => {
    if (err) {
      console.error('Error executing query:', err);
      res.json({
        success: false,
        message: "Some error occurred"
      })
    } else {
      // console.log('Data fetched successfully %j', seatsData);
      res.json(bookingData)
    }
  })
});

app.post('/booking', async (req, res) => {
  const email = req.body.email;
  const seats = req.body.seats;

  try {
    const seatsData = await getDetailFromSeatIDs(seats);
    let noneBooked = true;

    seatsData.forEach((element) => {
      if (element.booked === 1) {
        noneBooked = false;
      }
    });
    if (noneBooked) {
      const result = await bookSeats(seatsData, email);
      res.json({
        success: true,
        data: result
      })
    }
    else {
      res.json({
        success: false,
        message: "Sorry for inconvenience, Some seats were booked already"
      })
    }
  } catch (err) {
    res.json({
      success: false,
      message: "Server Error"
    })
  }
});


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

// ------------------------- Functions -----------------//
const getDetailFromSeatIDs = (seats) => {
  console.log("Seats from funciton %j", seats)
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM seats WHERE seatID in (?)', [seats], (err, seatsData) => {
      if (err) {
        console.error('Error executing query:', err);
        reject(err)
      } else {
        console.log('Data fetched successfully %j', seatsData);
        resolve(seatsData)
      }
    })
  });
}
const getCountBookedForClass = (seatClass) => {
  return new Promise((resolve, reject) => {
    connection.query('SELECT COUNT(*) as count FROM seats WHERE seatClass = ? and booked = 1', seatClass, (err, countBooked) => {
      if (err) {
        console.error('Error executing query:', err);
        reject(err)
      } else {
        console.log('Data fetched successfully %j', countBooked);
        resolve(countBooked)
      }
    })
  });
}
const getPriceByClass = (seatClass) => {
  return new Promise((resolve, reject) => {
    connection.query('SELECT minPrice, normalPrice, maxPrice FROM seatPricing WHERE seatClass = ?', seatClass, (err, pricing) => {
      if (err) {
        console.error('Error executing query:', err);
        reject(err)
      } else {
        console.log('Data fetched successfully %j', pricing);
        resolve(pricing)
      }
    })
  });
}


const updateBookingStatus = (price, seatID, emailID) => {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE seats SET booked = 1 WHERE seatID = ?', seatID, (err, resultFinal) => {
      if (err) {
        console.error('Error executing query:', err);
        reject(err);
      } else {
        connection.query('INSERT INTO booking SET ?', { seatID: seatID, price: price, emailID: emailID }, (err, resultFinal) => {
          if (err) {
            console.error('Error executing query:', err);
            reject(err);
          } else {
            console.log("Seat Booked finally");
            resolve({
              price: price,
              seatID: seatID
            })
          }
        });
      }
    });
  });
}
const bookSeats = (seatsData, email) => {
  return new Promise(async (resolve, reject) => {
    const result = [];

    try {
      const promises = seatsData.map(async (element) => {
        const countBooked = await getCountBookedForClass(element.seatClass);
        let percentage = countBooked.count / totalSeats[element.seatClass];
        percentage = percentage * 100;
        const pricing = await getPriceByClass(element.seatClass);
        let price;
        if (percentage < 40) {
          if (pricing[0]?.minPrice === null) {
            price = pricing[0]?.normalPrice;
          } else {
            price = pricing[0].minPrice;
          }
        } else if (percentage >= 40 && percentage < 60) {
          if (pricing[0]?.normalPrice === null) {
            price = pricing[0]?.maxPrice;
          } else {
            price = pricing[0].normalPrice;
          }
        } else {
          if (pricing[0]?.maxPrice === null) {
            price = pricing[0]?.normalPrice;
          } else {
            price = pricing[0].maxPrice;
          }
        }
        console.log("price %j", pricing[0]);
        const resultUpdated = await updateBookingStatus(price, element.seatID, email);
        console.log("result Updated %j", resultUpdated)
        return resultUpdated;
      });

      const resolvedResults = await Promise.all(promises);
      result.push(...resolvedResults);

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

