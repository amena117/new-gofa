using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Models;
using Gofabackend.Data;

namespace Gofabackend.Services
{
    public class MiniStoreBinCardService
    {
        private readonly ApplicationDbContext _context;

        // Constructor to inject the database context
        public MiniStoreBinCardService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Method to add or update a serial number record
        public void AddOrUpdateSerialNumber(int binCardId, string serialNumber, DateTime? inDate, DateTime? outDate, string status)
        {
            var serialNumberRecord = new MiniStoreBinCardSerialNumber
            {
                MiniStoreBinCardId = binCardId,
                SerialNumber = serialNumber,
                InDate = inDate ?? DateTime.Now, // If inDate is null, use current date
                OutDate = outDate,
                Status = status ?? "Available in stock"  // Default status if not provided
            };

            // Add the new serial number record to the database
            _context.MiniStoreBinCardSerialNumbers.Add(serialNumberRecord);
            _context.SaveChanges(); // Save the changes to the database
        }

        // You can also create other methods for additional operations like retrieving, updating, or deleting records
    }
}
