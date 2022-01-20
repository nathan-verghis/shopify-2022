# Welcome to my Shopify-2022 Application Project!

This is an inventory tracking web application with implemented CRUD functionality, as well as a feature to export data into a csv file!
There is also a high level of error-prevention, future support, and more, and I challenge you to try and break it!


## Database Installation

This was developed using a MariaDB server using Windows, which can be installed [here](https://mariadb.com/downloads/) with instructions [here](https://mariadb.com/kb/en/installing-mariadb-msi-packages-on-windows/)
Make sure to grab **version 10.6.5-GA** on **Windows 64-bit** [^1].
[^1]: Personally, I used WSL when I developed. If you also decide to execute your application from WSL, and your database from Windows, ensure the hostname in app.js *(see above)* is set to the **local** IP address of your windows machine. I wish I could tell you how long I wasted figuring that one out.... If you decide to use Mac or Linux, your mileage may vary, however you shouldn't run into that issue.
When installing MariaDB using the Setup Wizard, make sure you right down the **username**, **password**, and **port number** being used for setup! They will be needed later!


## Database Setup

Once your MariaDB server has been launched, you'll want to open Command Prompt, and type `mariadb -u {username} -p`. Enter in your password when prompted.
This should connect you to the database server. Once this has happened, copy and paste the following commands into your terminal.

`create database nathanverghis-shopify;`
`use nathanverghis-shopify;`

```
`CREATE TABLE `inventory` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `image_full` int(11) NOT NULL,
  `image_thumb` int(11) NOT NULL,
  `deleted` tinyint(1) NOT NULL,
  `delete_comment` varchar(150) DEFAULT NULL,
  `meta` varchar(100) DEFAULT NULL,
  `warehouse_id` int(11) NOT NULL,
  `Quantity` int(11) NOT NULL,
  PRIMARY KEY (`product_id`, `warehouse_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8;
```

You will then need to create some starter data for the database. Enter the following command into the terminal to create this data (bonus points if you recognize where it's from):

```
INSERT INTO nathanverghis-shopify.inventory (name,image_full,image_thumb,deleted,delete_comment,meta,warehouse_id,Quantity) VALUES
	 ('Doran''s Blade',0,0,0,NULL,'starter,AD',1,50),
	 ('Doran''s Ring',1,1,0,NULL,'starter,AP',1,75),
	 ('Kraken Slayer',11,11,0,NULL,'mythic,ADC',2,53),
	 ('Poro Snacks',222,222,0,NULL,'consumable',3,15),
	 ('Void Staff',42,42,0,NULL,'rare,AP',2,167);
```

After this you can close the terminal, the database is ready!


## Web Application Setup

In order to launch the Web Application, you will need to have npm installed on your computer, which can be done [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
If you are on Windows, you will need to first install WSL, which can be found [here](https://docs.microsoft.com/en-us/windows/wsl/install)

Download the repository to a target folder. Navigate to the folder using a UNIX terminal (WSL/Mac/Linux), and type `npm install`
While the node modules are installing, you can enter the database credentials in app.js (the credentials I mentioned earlier) on lines 31-37. Make sure the port number is an integer not a string.

Once the above has been completed, the Web Application and Database are ready to go!


## Usage

Enter the following into your terminal from the project root folder: `npm run dev [portNUM]`
*(portNum can be whatever you want)*

Open the browser of your choice (Chrome, Firefox, Safari, etc...)

Navigate to `localhost:[portNum]` in the address bar

Voila!
