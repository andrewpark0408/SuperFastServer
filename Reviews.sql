DROP TABLE IF EXISTS Review_Characteristics, Photos, ReviewsAll, Characteristics, Product_Characteristics, Reviews_Photos, characteristic_reviews, Products CASCADE;

CREATE TABLE Products (
    product_id INTEGER PRIMARY KEY,  -- Changed from SERIAL to INTEGER
    name VARCHAR(255) NOT NULL,
    slogan TEXT,
    description TEXT,
    category VARCHAR(100),
    default_price INTEGER
);

CREATE TABLE ReviewsAll (
    id INTEGER PRIMARY KEY,  -- Changed from SERIAL to INTEGER
    product_id INTEGER NOT NULL REFERENCES Products,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unix_timestamp BIGINT,
    summary TEXT,
    body TEXT,
    recommend BOOLEAN,
    reported BOOLEAN,
    reviewer_name VARCHAR(100),
    reviewer_email VARCHAR(255),
    response TEXT,
    helpfulness INTEGER DEFAULT 0
);

CREATE TABLE Reviews_Photos (
    photo_id INTEGER PRIMARY KEY,  -- Changed from SERIAL to INTEGER
    review_id INTEGER NOT NULL REFERENCES ReviewsAll,
    url TEXT NOT NULL
);

CREATE TABLE Characteristics (
    id INTEGER PRIMARY KEY,  -- Changed from SERIAL to INTEGER
    product_id INTEGER NOT NULL REFERENCES Products,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Characteristic_Reviews (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL,
    characteristic_id INTEGER NOT NULL,
    value INTEGER CHECK (value >= 1 AND value <= 5),
    FOREIGN KEY (review_id) REFERENCES ReviewsAll(id),
    FOREIGN KEY (characteristic_id) REFERENCES Characteristics(id)
);

CREATE TABLE Product_Characteristics (
    product_id INTEGER NOT NULL REFERENCES Products,
    characteristic_id INTEGER NOT NULL REFERENCES Characteristics,
    PRIMARY KEY (product_id, characteristic_id)
);
