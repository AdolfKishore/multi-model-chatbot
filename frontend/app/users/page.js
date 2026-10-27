
"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const EMPTY_FORM = { name: "", email: "", age: "" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [activeUserId, setActiveUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load users.");
      }

      setUsers(data.users || []);
      setActiveUserId((currentId) => {
        if (!data.users?.length) return null;

        return data.users.some((user) => user.id === currentId)
          ? currentId
          : data.users[0].id;
      });
    } catch (err) {
      setError(`${err.message} Check that FastAPI is running.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const activeUser = users.find((user) => user.id === activeUserId);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim();
    const age = Number(form.age);

    if (!name || !email || !form.age) {
      setError("Please complete all fields.");
      return;
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError("Age must be a whole number between 1 and 120.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/users/${editingId}`
          : `${API_URL}/users`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, age }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not save user.");
      }

      if (!editingId) setActiveUserId(data.id);

      setMessage(editingId ? "User updated." : "User added.");
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(user) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      age: String(user.age),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.name}?`)) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not delete user.");
      }

      if (editingId === user.id) resetForm();

      setMessage(`${user.name} was deleted.`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">User Management</h1>

        {activeUser && (
          <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-700">Active user</p>
            <h2 className="mt-1 text-lg font-semibold">{activeUser.name}</h2>
            <p className="text-sm text-gray-600">{activeUser.email}</p>
          </section>
        )}

        <section className="mb-8 rounded-xl border border-gray-300 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Update User" : "Add User"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your Name"
              maxLength={100}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 outline-none focus:border-indigo-500"
            />

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter Your Email"
              maxLength={254}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 outline-none focus:border-indigo-500"
            />

            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder="Enter your age"
              min="1"
              max="120"
              step="1"
              required
              className="w-full rounded border border-gray-400 px-3 py-2 outline-none focus:border-indigo-500"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update User"
                    : "Add User"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {message}
          </p>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Users</h2>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="text-sm font-medium text-indigo-700 underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            No users yet. Add your first user above.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const isActive = user.id === activeUserId;

              return (
                <article
                  key={user.id}
                  className={`rounded-xl border bg-white p-4 ${
                    isActive ? "border-indigo-500 ring-1 ring-indigo-100" : "border-gray-300"
                  }`}
                >
                  <h3 className="font-semibold">Name : {user.name}</h3>
                  <p className="text-sm text-gray-600">Email : {user.email}</p>
                  <p className="text-sm text-gray-600">Age : {user.age}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => startEditing(user)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(user)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => {
                        setActiveUserId(user.id);
                        setMessage(`${user.name} is now the active user.`);
                        setError("");
                      }}
                      disabled={isActive}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {isActive ? "Active User" : "Switch User"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-sm text-gray-500">
          Total users: {users.length}
        </p>
      </main>
    </>
  );
}
