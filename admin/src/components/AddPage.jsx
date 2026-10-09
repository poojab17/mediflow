import React, { useRef, useState } from "react";
import { doctorDetailStyles } from "../assets/dummyStyles";
import { User, XCircle, Plus, Trash2 } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Eye, EyeOff } from "lucide-react";

const s = doctorDetailStyles;

const AddPage = () => {
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: "",
        specialization: "",
        imageFile: null,
        imagePreview: "",
        experience: "",
        qualifications: "",
        location: "",
        about: "",
        fee: "",
        patients: "",
        rating: "",
        schedule: {},
        availability: "Available",
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);


    const [slotDate, setSlotDate] = useState(null);
    const [slotTime, setSlotTime] = useState(null);
    const [loading, setLoading] = useState(false);

    // ================= IMAGE =================
    function handleImage(e) {
        const file = e.target.files[0];
        if (!file) return;

        setForm((p) => ({
            ...p,
            imageFile: file,
            imagePreview: URL.createObjectURL(file),
        }));
    }

    function removeImage() {
        setForm((p) => ({ ...p, imageFile: null, imagePreview: "" }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // ================= SCHEDULE =================
    function addSlot() {
        if (!slotDate || !slotTime) {
            alert("Select both date and time");
            return;
        }

        // SAFE COPY (IMPORTANT)
        const selectedDate = new Date(slotDate);
        const selectedTime = new Date(slotTime);

        // FORMAT DATE
        const date = selectedDate.toISOString().split("T")[0];

        // FORMAT TIME
        const hours = selectedTime.getHours();
        const minutes = selectedTime.getMinutes();

        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;

        const time = `${formattedHours}:${minutes
            .toString()
            .padStart(2, "0")} ${ampm}`;

        // UPDATE STATE
        setForm((prev) => {
            const newSchedule = { ...prev.schedule };

            if (!newSchedule[date]) {
                newSchedule[date] = [];
            }

            // PREVENT DUPLICATE
            if (!newSchedule[date].includes(time)) {
                newSchedule[date].push(time);
            }

            return { ...prev, schedule: newSchedule };
        });

        // RESET
        setSlotDate(null);
        setSlotTime(null);
    }

    function removeSlot(date, time) {
        setForm((prev) => {
            const newSchedule = { ...prev.schedule };
            newSchedule[date] = newSchedule[date].filter((t) => t !== time);

            if (!newSchedule[date].length) delete newSchedule[date];

            return { ...prev, schedule: newSchedule };
        });
    }

    // ================= VALIDATION =================
    function validate() {
        const req = [
            "name",
            "specialization",
            "experience",
            "qualifications",
            "location",
            "about",
            "fee",
            "patients",
            "rating",
            "email",
            "password",
        ];

        for (let k of req) if (!form[k]) return false;
        if (!form.imageFile) return false;
        if (!Object.keys(form.schedule).length) return false;

        return true;
    }

    // ================= SUBMIT =================
    async function handleAdd(e) {
        e.preventDefault();

        if (!validate()) {
            alert("Fill all fields + add schedule");
            return;
        }

        try {
            setLoading(true);

            const fd = new FormData();

            fd.append("name", form.name);
            fd.append("specialization", form.specialization);
            fd.append("experience", form.experience);
            fd.append("qualifications", form.qualifications);
            fd.append("location", form.location);
            fd.append("about", form.about);
            fd.append("fee", form.fee);
            fd.append("patients", form.patients);
            fd.append("rating", form.rating);
            fd.append("availability", form.availability);
            fd.append("email", form.email);
            fd.append("password", form.password);

            fd.append("schedule", JSON.stringify(form.schedule));

            if (form.imageFile) {
                fd.append("image", form.imageFile);
            }

            const res = await fetch("http://localhost:4000/api/doctors", {
                method: "POST",
                body: fd,
            });

            const data = await res.json();
            console.log(data);

            if (!res.ok) throw new Error();

            alert("Doctor Added Successfully");

            // RESET
            setForm({
                name: "",
                specialization: "",
                imageFile: null,
                imagePreview: "",
                experience: "",
                qualifications: "",
                location: "",
                about: "",
                fee: "",
                patients: "",
                rating: "",
                schedule: {},
                availability: "Available",
                email: "",
                password: "",
            });

            setSlotDate(null);
            setSlotTime(null);
        } catch (err) {
            console.error(err);
            alert("Error adding doctor");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={s.pageContainer + " flex justify-center"}>
            <div className="w-full max-w-5xl bg-white dark:bg-[#0f172a] p-8 rounded-2xl shadow-lg">

                <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 !text-emerald-600 dark:!text-white">
                    Add New Doctor
                </h1>

                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* IMAGE */}
                    <div className="col-span-1 md:col-span-2 flex justify-center">
                        <div className="
relative w-32 h-32 
border-2 border-dashed 
border-emerald-200 dark:border-gray-600 
rounded-full flex items-center justify-center 
overflow-hidden 
bg-white dark:bg-[#1f2937]
">

                            {form.imagePreview ? (
                                <>
                                    <img
                                        src={form.imagePreview}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                    >
                                        ✕
                                    </button>
                                </>
                            ) : (
                                <p className="text-gray-400 dark:text-gray-400">
                                    Upload Image
                                </p>
                            )}

                            <input
                                type="file"
                                onChange={handleImage}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* INPUTS */}
                    {[
                        ["name", "Full Name"],
                        ["specialization", "Specialization"],
                        ["location", "Location"],
                        ["experience", "Experience"],
                        ["qualifications", "Qualifications"],
                        ["fee", "Fee"],
                        ["patients", "Patients"],
                        ["rating", "Rating (1-5)"],
                        ["email", "Email"],
                        ["password", "Password"],
                    ].map(([key, placeholder]) => {

                        const isPassword = key === "password";

                        return (
                            <div key={key} className="relative">

                                <input
                                    type={
                                        isPassword
                                            ? showPassword
                                                ? "text"
                                                : "password"
                                            : key === "rating"
                                                ? "number"
                                                : "text"
                                    }
                                    placeholder={placeholder}
                                    value={form[key]}
                                    min={key === "rating" ? 1 : undefined}
                                    max={key === "rating" ? 5 : undefined}
                                    step={key === "rating" ? 1 : undefined}
                                    onChange={(e) => {
                                        let value = e.target.value;

                                        // rating validation
                                        if (key === "rating") {
                                            if (value === "") {
                                                setForm({ ...form, rating: "" });
                                                return;
                                            }

                                            const num = Number(value);
                                            if (num < 1 || num > 5) return;

                                            value = num;
                                        }

                                        setForm({ ...form, [key]: value });
                                    }}
                                    className={s.inputBase + (isPassword ? " pr-12" : "")}
                                />


                                {isPassword && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                )}
                            </div>
                        );
                    })}


                    {/* AVAILABILITY */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() =>
                                setForm({ ...form, availability: "Available" })
                            }
                            className={`px-4 py-2 rounded-lg border ${form.availability === "Available"
                                ? "bg-green-500 text-white dark:bg-emerald-500"
                                : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                                }`}
                        >
                            Available
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setForm({ ...form, availability: "Unavailable" })
                            }
                            className={`px-4 py-2 rounded-lg border ${form.availability === "Unavailable"
                                ? "bg-red-500 text-white"
                                : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                                }`}
                        >
                            Unavailable
                        </button>
                    </div>

                    {/* ABOUT */}
                    <textarea
                        placeholder="About Doctor"
                        value={form.about}
                        onChange={(e) =>
                            setForm({ ...form, about: e.target.value })
                        }
                        className={`col-span-1 md:col-span-2 ${s.textareaBase} h-28`}
                    />

                    {/* SCHEDULE */}

                    {/* SHOW ADDED SLOTS */}
                    <div className="col-span-1 md:col-span-2 mt-4 space-y-2">
                        {Object.keys(form.schedule).length === 0 && (
                            <p className="text-sm text-gray-400 dark:text-gray-400">No slots added</p>
                        )}

                        {Object.entries(form.schedule).map(([date, times]) => (
                            <div key={date} className="space-y-1">
                                <p className="text-sm font-semibold text-emerald-600 dark:text-gray-300">
                                    {date}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {times.map((time, i) => (
                                        <span
                                            key={i}
                                            className="
px-3 py-1 rounded-full 
bg-emerald-100 dark:bg-gray-700 
text-emerald-700 dark:text-white 
text-xs flex items-center gap-2
"
                                        >
                                            {time}
                                            <button
                                                type="button"
                                                onClick={() => removeSlot(date, time)}
                                                className="text-red-500"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>


                    <div className="col-span-1 md:col-span-2 flex gap-4 flex-wrap">
                        <DatePicker
                            selected={slotDate}
                            onChange={(d) => setSlotDate(d)}
                            placeholderText="Select Date"
                            className={s.inputBase}
                        />

                        <DatePicker
                            selected={slotTime}
                            onChange={(t) => setSlotTime(t)}
                            showTimeSelect
                            showTimeSelectOnly
                            dateFormat="hh:mm aa"
                            placeholderText="Select Time"
                            className={s.inputBase}
                        />

                        <button
                            type="button"
                            onClick={addSlot}
                            className="bg-teal-600 text-white px-4 rounded-xl"
                        >
                            + Add Slot
                        </button>
                    </div>

                    {/* SUBMIT */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`col-span-1 md:col-span-2 ${s.submitButton} ${s.submitButtonEnabled}`}
                    >
                        {loading ? "Adding..." : "Add Doctor"}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default AddPage;