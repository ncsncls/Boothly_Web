CREATE DATABASE IF NOT EXISTS boothly
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE boothly;

CREATE TABLE IF NOT EXISTS photobooth_rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_code CHAR(5) NOT NULL,
  room_mode ENUM('together', 'ldr') NOT NULL DEFAULT 'ldr',
  host_peer_id VARCHAR(128) DEFAULT NULL,
  guest_peer_id VARCHAR(128) DEFAULT NULL,
  host_joined_at TIMESTAMP NULL DEFAULT NULL,
  guest_joined_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_photobooth_rooms_room_code (room_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photobooth_room_participants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id BIGINT UNSIGNED NOT NULL,
  role ENUM('host', 'guest') NOT NULL,
  peer_id VARCHAR(128) DEFAULT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photobooth_room_participants_room_id (room_id),
  CONSTRAINT fk_photobooth_room_participants_room
    FOREIGN KEY (room_id) REFERENCES photobooth_rooms(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photobooth_captures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id BIGINT UNSIGNED NOT NULL,
  capture_token VARCHAR(64) NOT NULL,
  capture_type VARCHAR(16) NOT NULL DEFAULT 'single',
  title VARCHAR(120) NOT NULL DEFAULT 'Boothly',
  theme VARCHAR(32) NOT NULL DEFAULT 'cream',
  strip_url LONGTEXT DEFAULT NULL,
  shots_json LONGTEXT DEFAULT NULL,
  options_json LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_photobooth_captures_capture_token (capture_token),
  KEY idx_photobooth_captures_room_id (room_id),
  CONSTRAINT fk_photobooth_captures_room
    FOREIGN KEY (room_id) REFERENCES photobooth_rooms(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
