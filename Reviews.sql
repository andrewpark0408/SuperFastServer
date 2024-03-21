DROP TABLE IF EXISTS Review_Characteristics, Photos, ReviewsAll, Characteristics, Product_Characteristics, Products CASCADE;

CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slogan TEXT,
    description TEXT,
    category VARCHAR(100),
    default_price INTEGER
);

CREATE TABLE ReviewsAll (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unix_timestamp BIGINT,  -- Adding the unix_timestamp column
    summary TEXT,
    body TEXT,
    recommend BOOLEAN,
    reported BOOLEAN,
    reviewer_name VARCHAR(100),
    reviewer_email VARCHAR(255),
    response TEXT,
    helpfulness INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

CREATE TABLE Photos (
    photo_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (review_id) REFERENCES ReviewsAll(id)
);

CREATE TABLE Characteristics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Review_Characteristics (
    review_id INTEGER NOT NULL,
    characteristic_id INTEGER NOT NULL,
    value INTEGER CHECK (value >= 1 AND value <= 5),
    PRIMARY KEY (review_id, characteristic_id),
    FOREIGN KEY (review_id) REFERENCES ReviewsAll(id),
    FOREIGN KEY (characteristic_id) REFERENCES Characteristics(id)
);

CREATE TABLE Product_Characteristics (
    product_id INTEGER NOT NULL,
    characteristic_id INTEGER NOT NULL,
    PRIMARY KEY (product_id, characteristic_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (characteristic_id) REFERENCES Characteristics(id)
);
