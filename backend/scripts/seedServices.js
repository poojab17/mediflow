import mongoose from "mongoose";
import Service from "../models/Service.js";
import { connectDB } from "../config/db.js";

const diagnosticServices = [
  {
    name: "Complete Blood Count (CBC)",
    about: "A complete blood count (CBC) is a blood test used to evaluate your overall health and detect a wide range of disorders, including anemia, infection, and leukemia. It measures several components and features of your blood, including red blood cells, white blood cells, hemoglobin, hematocrit, and platelets.",
    shortDescription: "Comprehensive blood cell analysis including RBC, WBC, hemoglobin, hematocrit, and platelets",
    price: 500,
    available: true,
    instructions: [
      "Fasting is not required for this test",
      "Inform your doctor about any medications you are taking",
      "Wear a short-sleeved shirt or sleeves that can be rolled up easily"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Blood Glucose Test",
    about: "A blood glucose test measures the amount of glucose (sugar) in your blood. It is used to diagnose and monitor diabetes, prediabetes, and gestational diabetes. The test can be done fasting (after not eating for at least 8 hours) or randomly.",
    shortDescription: "Measures blood sugar levels to screen for and monitor diabetes",
    price: 150,
    available: true,
    instructions: [
      "For fasting glucose: Do not eat or drink anything except water for 8-10 hours before the test",
      "For random glucose: No special preparation needed",
      "Inform your doctor about any medications that may affect blood sugar"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Lipid Profile",
    about: "A lipid profile (lipid panel) measures the levels of specific lipids (fats) in your blood, including total cholesterol, LDL cholesterol, HDL cholesterol, and triglycerides. It helps assess your risk of cardiovascular disease.",
    shortDescription: "Measures cholesterol and triglyceride levels to assess heart disease risk",
    price: 800,
    available: true,
    instructions: [
      "Fast for 10-12 hours before the test (water is allowed)",
      "Avoid alcohol for 24 hours before the test",
      "Inform your doctor about any medications you are taking"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Liver Function Test (LFT)",
    about: "Liver function tests are blood tests used to help diagnose and monitor liver disease or damage. The tests measure the levels of certain enzymes and proteins in your blood, including ALT, AST, ALP, bilirubin, and albumin.",
    shortDescription: "Evaluates liver health by measuring enzymes, proteins, and bilirubin levels",
    price: 700,
    available: true,
    instructions: [
      "Fasting for 8-10 hours is recommended",
      "Avoid alcohol for at least 24 hours before the test",
      "Inform your doctor about all medications and supplements"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Kidney Function Test (KFT)",
    about: "Kidney function tests evaluate how well your kidneys are working. The tests measure levels of creatinine, blood urea nitrogen (BUN), electrolytes, and calculate the estimated glomerular filtration rate (eGFR).",
    shortDescription: "Assesses kidney function through creatinine, BUN, electrolytes, and eGFR",
    price: 650,
    available: true,
    instructions: [
      "Fasting is not usually required",
      "Stay well hydrated before the test",
      "Inform your doctor about all medications, especially NSAIDs and blood pressure medications"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Thyroid Function Test (TFT)",
    about: "Thyroid function tests measure how well your thyroid gland is working. The panel typically includes TSH, Free T3, and Free T4. These tests help diagnose hypothyroidism, hyperthyroidism, and monitor thyroid treatment.",
    shortDescription: "Measures TSH, Free T3, and Free T4 to evaluate thyroid gland function",
    price: 900,
    available: true,
    instructions: [
      "No fasting required",
      "Can be done at any time of day",
      "Inform your doctor about thyroid medications; you may need to adjust timing"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Vitamin D Test",
    about: "The 25-hydroxy vitamin D test measures the level of vitamin D in your blood. Vitamin D deficiency is common and can lead to bone pain, muscle weakness, and increased risk of fractures. This test helps determine if you need supplementation.",
    shortDescription: "Measures 25-hydroxy vitamin D levels to detect deficiency or toxicity",
    price: 1200,
    available: true,
    instructions: [
      "No fasting required",
      "No special preparation needed",
      "Inform your doctor about vitamin D supplements you may be taking"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Vitamin B12 Test",
    about: "A vitamin B12 test measures the level of vitamin B12 in your blood. Low B12 levels can cause anemia, nerve damage, and neurological symptoms. This test is often ordered when macrocytic anemia or neuropathy is suspected.",
    shortDescription: "Measures vitamin B12 levels to diagnose deficiency causing anemia or neuropathy",
    price: 850,
    available: true,
    instructions: [
      "Fasting for 6-8 hours is recommended",
      "Avoid alcohol before the test",
      "Inform your doctor about B12 supplements or injections"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "HbA1c Test",
    about: "The hemoglobin A1c (HbA1c) test measures your average blood sugar level over the past 2-3 months. It is used to diagnose prediabetes and diabetes, and to monitor how well diabetes is being managed over time.",
    shortDescription: "Measures average blood glucose over 2-3 months for diabetes diagnosis and monitoring",
    price: 550,
    available: true,
    instructions: [
      "No fasting required",
      "Can be done at any time of day",
      "No special preparation needed"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Urine Routine Examination",
    about: "A urinalysis (urine routine) is a test of your urine that can detect and manage a wide range of disorders, such as urinary tract infections, kidney disease, and diabetes. It checks the appearance, concentration, and content of urine.",
    shortDescription: "Comprehensive urine analysis for infection, kidney function, and metabolic disorders",
    price: 200,
    available: true,
    instructions: [
      "Collect first-morning midstream urine sample for best results",
      "Clean the genital area before collection",
      "Deliver sample to lab within 1-2 hours of collection"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "ECG",
    about: "An electrocardiogram (ECG or EKG) records the electrical activity of your heart. It is a quick, painless test that helps detect heart rhythm abnormalities, heart attacks, and other cardiac conditions.",
    shortDescription: "Records heart's electrical activity to detect arrhythmias and cardiac conditions",
    price: 300,
    available: true,
    instructions: [
      "Wear comfortable clothing that allows access to chest area",
      "Avoid applying lotions or oils on chest before the test",
      "Inform the technician about any medications you are taking"
    ],
    dates: [],
    slots: {}
  },
  {
    name: "Chest X-Ray",
    about: "A chest X-ray produces images of your heart, lungs, airways, blood vessels, and the bones of your spine and chest. It is used to diagnose conditions such as pneumonia, heart failure, lung cancer, and rib fractures.",
    shortDescription: "Imaging test to evaluate heart, lungs, and chest structures",
    price: 400,
    available: true,
    instructions: [
      "Remove jewelry and metal objects from chest area",
      "Wear a hospital gown provided by the facility",
      "Inform the technician if you are pregnant or may be pregnant",
      "Hold your breath briefly during the exposure"
    ],
    dates: [],
    slots: {}
  }
];

async function seedServices() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const serviceData of diagnosticServices) {
      // Use name as the unique key for idempotency
      const existingService = await Service.findOne({ name: serviceData.name });

      if (existingService) {
        // Update existing service with new data (except _id, createdAt)
        Object.assign(existingService, serviceData);
        await existingService.save();
        updated++;
        console.log(`Updated: ${serviceData.name}`);
      } else {
        // Create new service
        await Service.create(serviceData);
        created++;
        console.log(`Created: ${serviceData.name}`);
      }
    }

    console.log("\n--- Seeding Summary ---");
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Total processed: ${diagnosticServices.length}`);

    // Verify the services are in the database
    const allServices = await Service.find({}).sort({ name: 1 }).lean();
    console.log(`\nTotal services in database: ${allServices.length}`);
    console.log("\nServices list:");
    allServices.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} - ₹${s.price} - ${s.available ? "Available" : "Unavailable"}`);
    });

    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedServices();