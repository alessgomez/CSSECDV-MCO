-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema the_hungry_sibs
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `the_hungry_sibs` ;

-- -----------------------------------------------------
-- Schema the_hungry_sibs
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `the_hungry_sibs` DEFAULT CHARACTER SET utf8mb4 ;
USE `the_hungry_sibs` ;

-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Accounts`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Accounts` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`accounts` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`accounts` (
  `accountId` VARCHAR(36) NOT NULL,
  `firstName` VARCHAR(45) NOT NULL,
  `lastName` VARCHAR(45) NOT NULL,
  `email` VARCHAR(45) NOT NULL,
  `password` VARCHAR(72) NOT NULL,
  `address` VARCHAR(160) NOT NULL,
  `phoneNumber` VARCHAR(45) NOT NULL,
  `profilePicFilename` VARCHAR(45) NOT NULL,
  `role` VARCHAR(45) NOT NULL,
  `dateCreated` DATETIME NOT NULL,
  `dateEdited` DATETIME NULL DEFAULT NULL,
  `dateArchived` DATETIME NULL DEFAULT NULL,
  `isArchived` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`accountId`),
  UNIQUE INDEX `accountId_UNIQUE` (`accountId` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Bag`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Bag` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`bag` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`bag` (
  `bagId` VARCHAR(36) NOT NULL,
  `accountId` VARCHAR(36) NOT NULL,
  `subtotal` DECIMAL(10,0) NOT NULL,
  `deliveryFee` DECIMAL(10,0) NOT NULL,
  `total` DECIMAL(10,0) NOT NULL,
  PRIMARY KEY (`bagId`),
  UNIQUE INDEX `bagId_UNIQUE` (`bagId` ASC) VISIBLE,
  INDEX `bag_accountId` (`accountId` ASC) VISIBLE,
  CONSTRAINT `bag_accountId`
    FOREIGN KEY (`accountId`)
    REFERENCES `the_hungry_sibs`.`accounts` (`accountId`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Products`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Products` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`products` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`products` (
  `productId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(45) NOT NULL,
  `category` VARCHAR(45) NOT NULL,
  `price` DECIMAL(10,0) NOT NULL,
  `imageFilename` VARCHAR(45) NOT NULL,
  `isBestseller` TINYINT(1) NOT NULL DEFAULT 0,
  `isArchived` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`productId`),
  UNIQUE INDEX `productId_UNIQUE` (`productId` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`BagItems`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`BagItems` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`bagItems` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`bagItems` (
  `bagItemId` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `quantity` INT NOT NULL,
  `totalPrice` DECIMAL(10,0) NOT NULL,
  `bagId` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`bagItemId`),
  UNIQUE INDEX `bagItemId_UNIQUE` (`bagItemId` ASC) VISIBLE,
  INDEX `productId_idx` (`productId` ASC) VISIBLE,
  INDEX `bagId_idx` (`bagId` ASC) VISIBLE,
  CONSTRAINT `bagItems_bagId`
    FOREIGN KEY (`bagId`)
    REFERENCES `the_hungry_sibs`.`bag` (`bagId`)
    ON DELETE CASCADE,
  CONSTRAINT `bagItems_productId`
    FOREIGN KEY (`productId`)
    REFERENCES `the_hungry_sibs`.`products` (`productId`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Orders`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Orders` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`orders` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`orders` (
  `orderId` VARCHAR(36) NOT NULL,
  `accountId` VARCHAR(36) NOT NULL,
  `total` DECIMAL(10,0) NOT NULL,
  `subtotal` DECIMAL(10,0) NOT NULL,
  `deliveryFee` DECIMAL(10,0) NOT NULL,
  `dateOrdered` DATETIME NOT NULL,
  `ETAMin` DATETIME NOT NULL,
  `ETAMax` DATETIME NOT NULL,
  `notes` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`orderId`),
  UNIQUE INDEX `orderId_UNIQUE` (`orderId` ASC) VISIBLE,
  INDEX `accountId_idx` (`accountId` ASC) VISIBLE,
  CONSTRAINT `orders_accountId`
    FOREIGN KEY (`accountId`)
    REFERENCES `the_hungry_sibs`.`accounts` (`accountId`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`OrderItems`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`OrderItems` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`orderItems` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`orderItems` (
  `orderItemId` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `quantity` INT NOT NULL,
  `totalPrice` DECIMAL(10,0) NOT NULL,
  `orderId` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`orderItemId`),
  UNIQUE INDEX `orderItemId_UNIQUE` (`orderItemId` ASC) VISIBLE,
  INDEX `productId_idx` (`productId` ASC) VISIBLE,
  INDEX `orderId_idx` (`orderId` ASC) VISIBLE,
  CONSTRAINT `orderItems_orderId`
    FOREIGN KEY (`orderId`)
    REFERENCES `the_hungry_sibs`.`orders` (`orderId`)
    ON DELETE CASCADE,
  CONSTRAINT `orderItems_productId`
    FOREIGN KEY (`productId`)
    REFERENCES `the_hungry_sibs`.`products` (`productId`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Sessions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Sessions` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`sessions` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`sessions` (
  `session_id` VARCHAR(128) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_bin' NOT NULL,
  `expires` INT UNSIGNED NOT NULL,
  `data` MEDIUMTEXT CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_bin' NULL DEFAULT NULL,
  PRIMARY KEY (`session_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`SessionData`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`SessionData` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`sessionData` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`sessionData` (
  `sessionId` VARCHAR(128) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_bin' NOT NULL,
  `accountId` VARCHAR(36) NOT NULL,
  `verified` TINYINT(1) NOT NULL,
  `pendingOTC` VARCHAR(45) NULL DEFAULT NULL,
  `pendingOTCTimestamp` DATETIME NULL,
  PRIMARY KEY (`sessionId`),
  INDEX `sessionData_sessionId_idx` (`sessionId` ASC) VISIBLE,
  INDEX `sessionData_accountId_idx` (`accountId` ASC) VISIBLE,
  UNIQUE INDEX `sessionId_UNIQUE` (`sessionId` ASC) VISIBLE,
  CONSTRAINT `sessionData_accountId`
    FOREIGN KEY (`accountId`)
    REFERENCES `the_hungry_sibs`.`accounts` (`accountId`)
    ON DELETE CASCADE,
  CONSTRAINT `sessionData_sessionId`
    FOREIGN KEY (`sessionId`)
    REFERENCES `the_hungry_sibs`.`sessions` (`session_id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Feedbacks`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Feedbacks` ;
DROP TABLE IF EXISTS `the_hungry_sibs`.`feedbacks` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`feedbacks` (
  `feedbackId` VARCHAR(36) NOT NULL,
  `accountId` VARCHAR(36) NOT NULL,
  `subject` VARCHAR(45) NOT NULL,
  `message` VARCHAR(200) NOT NULL,
  PRIMARY KEY (`feedbackId`),
  INDEX `feedbacks_accountId_idx` (`accountId` ASC) VISIBLE,
  UNIQUE INDEX `feedbackId_UNIQUE` (`feedbackId` ASC) VISIBLE,
  CONSTRAINT `feedbacks_accountId`
    FOREIGN KEY (`accountId`)
    REFERENCES `the_hungry_sibs`.`accounts` (`accountId`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Inserts initial admin account (John Doe)
-- EMAIL: hannah.regine.fong@gmail.com
-- PASSWORD: JohnD0e!
-- -----------------------------------------------------
INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `address`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'John', 'Doe', 'hannah.regine.fong@gmail.com', '$2b$12$BEhAs9dJtfNoYJLwePb8S.lOuJBCqCEBjIWRETY/OS6plDcTp9lQq', '123 Address', '09123456789', '3ea79cc4-71fc-4052-b0bb-237e2c8449f0.png', 'ADMIN', CURRENT_TIMESTAMP);

-- -----------------------------------------------------
-- Inserts initial user accounts
-- PASSWORD FOR ALL: C4sh4y1!
-- -----------------------------------------------------
INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `address`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Hannah', 'Fong', 'hannah_regine_fong@dlsu.edu.ph', '$2a$12$rq19f3gn/UobANhyxRZpmurOK8GDI.MMPs/uWXVBoip4BwMreN6My', '123 Address', '09234567891', '05bc9c24-1d60-4a04-881b-7dca5f93cffb.jpg', 'USER', CURRENT_TIMESTAMP);

INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `address`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Alessandra', 'Gomez', 'alessandra_gomez@dlsu.edu.ph', '$2a$12$245HIwNTy7p1nt45fe8PnOZA5xr8g6StXQ7llwtlJq8eiCSD3p4xK', '123 Address', '09345678912', 'e3b21581-b4b4-43e4-9b42-312780b36f1e.jpg', 'USER', CURRENT_TIMESTAMP);

INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `address`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Ibrahim', 'Kahil', 'ibrahim_kahil@dlsu.edu.ph', '$2a$12$lxHdnhHgyjNlFXyU7P7H7.aVvY4gL.wqe2yHT1pdzOgPWG26geNIO', '123 Address', '09456789123', 'bd987281-29a2-11ef-8527-d8bbc1ac6888.jpg', 'USER', CURRENT_TIMESTAMP);

INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `address`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Shaun', 'Ong', 'shaun_ong@dlsu.edu.ph', '$2a$12$rk86H2l9/Algk4bTM1eYOOTlKrScFrZPDZBI4ntQ8yKpl8SDzRYd.', '123 Address', '09567891234', 'cc1658c1-29a2-11ef-8527-d8bbc1ac6888.jpg', 'USER', CURRENT_TIMESTAMP);

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;