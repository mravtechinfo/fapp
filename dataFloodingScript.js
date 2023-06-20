const fs = require('fs');
const csv = require('csv-parser');

const results = [];

// const fillData = (connection) => {
//     fs.createReadStream('/home/mrtwinklesharma/flurnAssignment/mock.csv')
//   .pipe(csv())
//   .on('data', (data) => results.push(data))
//   .on('end', () => {
//     // Process the CSV data
//     console.log("result from csv fetched");
//     console.log("Filling to sql")
//     results.forEach((data)=>{
//         connection.query('INSERT INTO seats SET ?', data, (err, res) => {
//             if (err) {
//               console.error('Error executing query:', err);
//             } else {
//               console.log('Data inserted successfully %j', res)
//             }
//           });
//     })
//   });
// }

const fillData = (connection) => {
    fs.createReadStream('/home/mrtwinklesharma/flurnAssignment/mock2.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    // Process the CSV data
    console.log("result from csv fetched");
    console.log("Filling to sql")

    
    results.forEach((data)=>{
        
        let str1 =  data.minPrice;
        let modifiedStr1 = str1.replace(/\$/g, "");
        delete data.minPrice;
        data.minPrice = parseFloat(modifiedStr1) ? parseFloat(modifiedStr1)  : null ;


        let str2 =  data.normalPrice;
        let modifiedStr2 = str2.replace(/\$/g, "");
        delete data.normalPrice;
        data.normalPrice = parseFloat(modifiedStr2) ? parseFloat(modifiedStr2)  : null ;


        let str3 =  data.maxPrice;
        let modifiedStr3 = str3.replace(/\$/g, "");
        delete data.maxPrice;
        data.maxPrice = parseFloat(modifiedStr3) ? parseFloat(modifiedStr3)  : null ;

        console.log(data);
        connection.query('INSERT INTO seatPricing SET ?', data, (err, res) => {
            if (err) {
              console.error('Error executing query:', err);
            } else {
              console.log('Data inserted successfully %j', res)
            }
          });
    })
  });
}
module.exports = fillData;
