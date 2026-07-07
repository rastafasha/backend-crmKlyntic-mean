
//repite cada 15 segundos
// cron.schedule("*/15 * * * * *", function () {
//   console.log("---------------------");
//   console.log("running a task every 15 seconds");
// });
//repite cada 15 segundos


//send email after 1 minute
cron.schedule("1 * * * *", function () {
    // mailService();
  });
  
  function mailService() {
    let mailTransporter = nodemailer.createTransport({
      service: "gmail",
      host: 'smtp.gmail.com',
        port: 587,
      auth: {
        user: "mercadocreativo@gmail.com",
  // use generated app password for gmail
        pass: "brcgdrbbddkmuxhk",
      },
    });
  
    // setting credentials
    let mailDetails = {
      from: "mercadocreativo@gmail.com",
    //   to: "<user-email>@gmail.com",
      to: "mercadocreativo@gmail.com",
      subject: "Test Mail using Cron Job",
      text: "Node.js Cron Job Email Demo Test from Reflectoring Blog",
    };
  
    // sending email
    mailTransporter.sendMail(mailDetails, function (err, data) {
      if (err) {
        console.log("error occurred", err.message);
      } else {
        console.log("---------------------");
        console.log("email sent successfully");
      }
    });
  }

//Monitoring Server Resources Over Time
// setting a cron job for every 15 seconds

cron.schedule("*/15 * * * * *", function () {
    let heap = process.memoryUsage().heapUsed / 1024 / 1024;
    let date = new Date().toISOString();
    const freeMemory = Math.round((os.freemem() * 100) / os.totalmem()) + "%";
  
    //                 date | heap used | free memory
    let csv = `${date}, ${heap}, ${freeMemory}\n`;
  
    // storing log In .csv file
    fs.appendFile("./uploads/demo.csv", csv, function (err) {
      if (err) throw err;
      console.log("server details logged!");
    });
  });
//Monitoring Server Resources Over Time

// remove the demo.csv file every twenty-first day of the month.
cron.schedule("0 0 25 * *", function () {
    console.log("---------------------");
    console.log("deleting logged status");
    fs.unlink("./demo.csv", err => {
      if (err) throw err;
      console.log("deleted successfully");
    });
  });


//update compra
  cron.schedule("*/60 * * * * *", function () {
  console.log("---------------------");
  console.log("running a task every 60 seconds");

  Pago.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, pago_data) => {
    if (err) {
        res.status(500).send({ message: err });
    } else {
        if (pago_data) {
            res.status(200).send({ pago: pago_data });
        } else {
            res.status(403).send({ message: 'No se actualizó el pago, vuelva a intentar nuevamente.' });
        }
    }

    console.log("--pago_data", pago_data);
})

});

module.exports = crons;


