CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    age INT,
    zodiac_sign VARCHAR(20),
    city VARCHAR(50),
    about TEXT,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255)
);