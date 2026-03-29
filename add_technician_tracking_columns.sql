-- Phase 3: Add Technician Tracking Columns to MaintenanceRequestRegisters
-- Run this script on your database to add the new columns

USE GofaDb;
GO

-- Add MaintainedByUserId column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[MaintenanceRequestRegisters]') AND name = 'MaintainedByUserId')
BEGIN
    ALTER TABLE [dbo].[MaintenanceRequestRegisters]
    ADD [MaintainedByUserId] INT NULL;
    PRINT 'Added MaintainedByUserId column';
END
ELSE
BEGIN
    PRINT 'MaintainedByUserId column already exists';
END
GO

-- Add TechnicianRole column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[MaintenanceRequestRegisters]') AND name = 'TechnicianRole')
BEGIN
    ALTER TABLE [dbo].[MaintenanceRequestRegisters]
    ADD [TechnicianRole] NVARCHAR(100) NULL;
    PRINT 'Added TechnicianRole column';
END
ELSE
BEGIN
    PRINT 'TechnicianRole column already exists';
END
GO

PRINT 'Technician tracking columns added successfully!';
GO
