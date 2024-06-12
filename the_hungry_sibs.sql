-- MySQL Script generated by MySQL Workbench
-- Fri Jun  7 15:47:15 2024
-- Model: New Model    Version: 1.0
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
CREATE SCHEMA IF NOT EXISTS `the_hungry_sibs` DEFAULT CHARACTER SET utf8 ;
USE `the_hungry_sibs` ;

-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Accounts`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Accounts` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`Accounts` (
  `accountId` VARCHAR(36) NOT NULL,
  `firstName` VARCHAR(45) NOT NULL,
  `lastName` VARCHAR(45) NOT NULL,
  `email` VARCHAR(45) NOT NULL,
  `password` VARCHAR(72) NOT NULL,
  `phoneNumber` VARCHAR(45) NOT NULL,
  `profilePicFilename` VARCHAR(45) NOT NULL,
  `role` VARCHAR(45) NOT NULL,
  `dateCreated` DATETIME NOT NULL,
  `dateEdited` DATETIME,
  `dateDeleted` DATETIME,
  PRIMARY KEY (`accountId`),
  UNIQUE INDEX `accountId_UNIQUE` (`accountId` ASC) VISIBLE,
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE,
  UNIQUE INDEX `phoneNumber_UNIQUE` (`phoneNumber` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Products`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Products` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`Products` (
  `productId` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  `category` VARCHAR(45) NOT NULL,
  `price` DECIMAL NOT NULL,
  `imageFilename` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`productId`),
  UNIQUE INDEX `productId_UNIQUE` (`productId` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Orders`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Orders` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`Orders` (
  `orderId` INT NOT NULL AUTO_INCREMENT,
  `accountId` VARCHAR(36) NOT NULL,
  `total` DECIMAL NOT NULL,
  `subtotal` DECIMAL NOT NULL,
  `deliveryFee` DECIMAL NOT NULL,
  `dateOrdered` DATETIME NOT NULL,
  `ETAMin` DATETIME NOT NULL,
  `ETAMax` DATETIME NOT NULL,
  `notes` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`orderId`),
  INDEX `accountId_idx` (`accountId` ASC) VISIBLE,
  UNIQUE INDEX `orderId_UNIQUE` (`orderId` ASC) VISIBLE,
  CONSTRAINT `orders_accountId`
    FOREIGN KEY (`accountId`)
    REFERENCES `the_hungry_sibs`.`Accounts` (`accountId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`OrderItems`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`OrderItems` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`OrderItems` (
  `orderItemId` INT NOT NULL AUTO_INCREMENT,
  `productId` INT NOT NULL,
  `quantity` INT NOT NULL,
  `totalPrice` DECIMAL NOT NULL,
  `orderId` INT NOT NULL,
  PRIMARY KEY (`orderItemId`),
  UNIQUE INDEX `orderItemId_UNIQUE` (`orderItemId` ASC) VISIBLE,
  INDEX `productId_idx` (`productId` ASC) VISIBLE,
  INDEX `orderId_idx` (`orderId` ASC) VISIBLE,
  CONSTRAINT `orderItems_productId`
    FOREIGN KEY (`productId`)
    REFERENCES `the_hungry_sibs`.`Products` (`productId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `orderItems_orderId`
    FOREIGN KEY (`orderId`)
    REFERENCES `the_hungry_sibs`.`Orders` (`orderId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`Bag`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`Bag` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`Bag` (
  `bagId` INT NOT NULL AUTO_INCREMENT,
  `accountId` VARCHAR(36) NOT NULL,
  `subtotal` DECIMAL NOT NULL,
  `deliveryFee` DECIMAL NOT NULL,
  `total` DECIMAL NOT NULL,
  PRIMARY KEY (`bagId`),
  UNIQUE INDEX `bagId_UNIQUE` (`bagId` ASC) VISIBLE,
  CONSTRAINT `bag_accountId`
    FOREIGN KEY (`accountId`)
    REFERENCES `the_hungry_sibs`.`Accounts` (`accountId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `the_hungry_sibs`.`BagItems`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `the_hungry_sibs`.`BagItems` ;

CREATE TABLE IF NOT EXISTS `the_hungry_sibs`.`BagItems` (
  `bagItemId` INT NOT NULL AUTO_INCREMENT,
  `productId` INT NOT NULL,
  `quantity` INT NOT NULL,
  `totalPrice` DECIMAL NOT NULL,
  `bagId` INT NOT NULL,
  PRIMARY KEY (`bagItemId`),
  UNIQUE INDEX `bagItemId_UNIQUE` (`bagItemId` ASC) VISIBLE,
  INDEX `productId_idx` (`productId` ASC) VISIBLE,
  INDEX `bagId_idx` (`bagId` ASC) VISIBLE,
  CONSTRAINT `bagItems_productId`
    FOREIGN KEY (`productId`)
    REFERENCES `the_hungry_sibs`.`Products` (`productId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `bagItems_bagId`
    FOREIGN KEY (`bagId`)
    REFERENCES `the_hungry_sibs`.`Bag` (`bagId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Inserts initial admin account (John Doe)
-- EMAIL: hannah.regine.fong@gmail.com
-- PASSWORD: JohnD0e!
-- -----------------------------------------------------
INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'John', 'Doe', 'hannah.regine.fong@gmail.com', '$2b$12$BEhAs9dJtfNoYJLwePb8S.lOuJBCqCEBjIWRETY/OS6plDcTp9lQq', '09123456789', 'admin.jpg', 'ADMIN', CURRENT_TIMESTAMP);

-- -----------------------------------------------------
-- Inserts initial user accounts
-- PASSWORD FOR ALL: C4sh4y1!
-- -----------------------------------------------------
INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Hannah', 'Fong', 'hannah_regine_fong@dlsu.edu.ph', '$2a$12$rq19f3gn/UobANhyxRZpmurOK8GDI.MMPs/uWXVBoip4BwMreN6My', '09234567891', 'default.jpg', 'USER', CURRENT_TIMESTAMP);

INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Alessandra', 'Gomez', 'alessandra_gomez@dlsu.edu.ph', '$2a$12$245HIwNTy7p1nt45fe8PnOZA5xr8g6StXQ7llwtlJq8eiCSD3p4xK', '09345678912', 'default.jpg', 'USER', CURRENT_TIMESTAMP);

INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Ibrahim', 'Kahil', 'ibrahim_kahil@dlsu.edu.ph', '$2a$12$lxHdnhHgyjNlFXyU7P7H7.aVvY4gL.wqe2yHT1pdzOgPWG26geNIO', '09456789123', 'default.jpg', 'USER', CURRENT_TIMESTAMP);

INSERT INTO `the_hungry_sibs`.`accounts` (`accountId`, `firstName`, `lastName`, `email`, `password`, `phoneNumber`, `profilePicFilename`, `role`, `dateCreated`)
VALUES (UUID(), 'Shaun', 'Ong', 'shaun_ong@dlsu.edu.ph', '$2a$12$rk86H2l9/Algk4bTM1eYOOTlKrScFrZPDZBI4ntQ8yKpl8SDzRYd.', '09567891234', 'default.jpg', 'USER', CURRENT_TIMESTAMP);

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
