// Floorpage.jsx
import React, {
  useEffect,
  useState,
  useCallback,   // NEW
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow } from "date-fns";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Modal, Button, Form, Card, Row, Col, Container } from "react-bootstrap";
import * as XLSX from "xlsx";

const Loader = ({ text = "Loading...", centered = true }) => (
  <div className={`d-flex ${centered ? "justify-content-center" : ""} align-items-center my-3`}>
    <div className="spinner-border text-primary me-2" role="status" />
    <span className="fs-5">{text}</span>
  </div>
);

const Floorpage = () => {
  const navigate = useNavigate();
  const { blockname } = useParams();

  /* ───────────────────────────── State ───────────────────────────── */
  const [block, setBlock] = useState(() => {
    try {
      const saved = localStorage.getItem("block");
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error("Invalid JSON in localStorage for 'block':", err);
      localStorage.removeItem("block");
      return null;
    }
  });
  const [floorid, setFloorid]           = useState(null);
  const [floorName, setFloorName]       = useState("");
  const [roomdata, setRoomData]         = useState([]);
  const [roomSearch, setRoomSearch]     = useState("");
  const [dept, setDept]                 = useState("");
  const [err, setErr]                   = useState("");
  const [access, setAccess]             = useState("");
  const [showDialog, setShowDialog]     = useState(false);
  const [dialogType, setDialogType]     = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [loading, setLoading]           = useState(false);
  const [timetables, setTimetables]     = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData]   = useState([]);

  /* ───────────────────────────── Helpers ─────────────────────────── */
  const getCurrentPeriod = (timetable, testHour = null, testMin = null) => {
    try {
      if (!timetable || !Array.isArray(timetable)) {
        return { status: "Invalid timetable" };
      }

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const now  = new Date();

      if (testHour !== null && testMin !== null) {
        now.setHours(testHour);
        now.setMinutes(testMin);
      }

      const today = days[now.getDay()];
      if (today === "Sunday") return { status: "Sunday is Holiday" };

      const currentHour = now.getHours();     // 24‑hour clock ✔
      const currentMin  = now.getMinutes();
      const currentTime = currentHour * 60 + currentMin;
      if (currentTime > 16 * 60 + 20) return { status: "No Classes" };

      const todayData = timetable.find(day => day.dayName === today);
      if (!todayData || !todayData.periods?.length) return { status: "No Classes" };

      const parseTime = (str) => {
        const [time, mod]         = str.trim().split(" ");
        let [hrs, mins]           = time.split(":").map(Number);
        if (mod === "PM" && hrs !== 12) hrs += 12;
        if (mod === "AM" && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      };

      const period = todayData.periods.find(p => {
        const start = parseTime(p.startTime);
        const end   = parseTime(p.endTime);
        return currentTime >= start && currentTime <= end;
      });

      if (period) {
        return {
          status: "Ongoing",
          info: (
            <>
              <div><strong>Period:</strong> {period.periodNumber}</div>
              <div><strong>Faculty:</strong> {period.faculty}</div>
              <div><strong>Time:</strong> {period.startTime} - {period.endTime}</div>
              <div><strong>Subject:</strong> {period.subject}</div>
            </>
          ),
        };
      }

      return { status: "Free Period" };
    } catch (e) {
      console.error(e.message);
      return { status: "Error" };
    }
  };

  const getRoomsWithTimetable = async () => {
    const res = await fetch("https://dr-backend-32ec.onrender.com/periods/available-timetables");
    return res.json();
  };

  /* ─────────────────────────── Timetable Fetch ───────────────────── */
  const fetchTimetables = useCallback(async () => {
    try {
      if (!roomdata.length) return;          // guard
      setLoading(true);
      const results               = {};
      const roomsWithTimetable    = await getRoomsWithTimetable();

      await Promise.all(
        roomdata
          .filter(r => roomsWithTimetable.includes(r.room_name))
          .map(async (room) => {
            const encoded = encodeURIComponent(room.room_name);
            try {
              const res = await fetch(`https://dr-backend-32ec.onrender.com/periods/${encoded}`);
              results[room.room_name] = res.ok ? (await res.json()).timetableData : null;
            } catch {
              results[room.room_name] = null;
            }
          }),
      );

      setTimetables(results);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomdata]);

  /* ─────────────────────── Initial Auth & Block Fetch ─────────────── */
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (token) {
      try {
        setLoading(true);
        const decode = jwtDecode(token);
        setAccess(decode.role);
        setDept(decode.dept);
      } catch {
        console.error("Invalid token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }

    const fetchBlockData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`https://dr-backend-32ec.onrender.com/block/get-data-name/${blockname}`);
        setBlock(res.data);
        localStorage.setItem("block", JSON.stringify(res.data));
      } catch (error) {
        setErr("Failed to fetch updated block data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (blockname) fetchBlockData();
  }, [blockname, navigate]);

  /* ─────────── Restore selected floor & rooms on first load ───────── */
  useEffect(() => {
    const saved = sessionStorage.getItem("selectedFloor");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFloorid(parsed);
        setRoomData(parsed.rooms);
      } catch (e) {
        console.error("Invalid JSON in sessionStorage for 'selectedFloor'", e);
        sessionStorage.removeItem("selectedFloor");
      }
    }
  }, []);

  /* ───────────────── Fetch timetables once rooms are ready ────────── */
  useEffect(() => {
    if (roomdata.length) fetchTimetables();
  }, [roomdata, fetchTimetables]);

  /* ─────────────── Background refresh every minute (rooms ready) ──── */
  useEffect(() => {
    if (!roomdata.length) return;
    const id = setInterval(fetchTimetables, 60_000);
    return () => clearInterval(id);
  }, [roomdata, fetchTimetables]);

  /* ────────────────────── Occupancy updater (guarded) ─────────────── */
  useEffect(() => {
    if (!block || !floorid || !roomdata.length) return;

    const updateOccupancy = async () => {
      for (const room of roomdata) {
        const timetable   = timetables[room.room_name];
        if (!timetable) continue;

        const now   = new Date();
        const hour  = now.getHours();  // 24‑hour
        const min   = now.getMinutes();
        const info  = getCurrentPeriod(timetable, hour, min);
        const occ   = info.status === "Ongoing";

        if (room.occupied !== occ) {
          try {
            await fetch(
              `https://dr-backend-32ec.onrender.com/block/floors/room/${block._id}/${floorid._id}/${room._id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ occupied: occ }),
              },
            );
            console.log(`Updated occupancy for ${room.room_name}`);
          } catch (e) {
            console.error(`Failed to update room ${room.room_name}:`, e);
          }
        }
      }
    };

    updateOccupancy();
  }, [block, floorid, roomdata, timetables]);

  /* ────────────────────────── File upload helpers ─────────────────── */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (!file) return;

    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = (ev) => {
      const binary   = ev.target.result;
      const wb       = XLSX.read(binary, { type: "binary" });
      const sheet    = wb.Sheets[wb.SheetNames[0]];
      const parsed   = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setPreviewData(parsed);
    };
  };

  const handleUpload = async (room) => {
    if (!selectedFile || !room) return alert("Please select a file first.");
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("className", room);

    try {
      const res = await fetch("https://dr-backend-32ec.onrender.com/periods/upload", {
        method: "POST",
        body : formData,
      });
      const data = await res.json();
      await fetchTimetables();
      alert(data.message);
    } catch (e) {
      console.error(e);
      alert("Upload failed!");
    }
  };

  const deleteTimetableByClass = async (cls) => {
    if (!window.confirm(`Delete timetable for ${cls}?`)) return;
    try {
      await axios.delete(`https://dr-backend-32ec.onrender.com/periods/class/${cls}`);
      await fetchTimetables();
      alert("Timetable deleted successfully!");
    } catch (e) {
      console.error("Failed to delete timetable:", e);
      alert("Error deleting timetable");
    }
  };

  /* ───────────────────────────── UI helpers ───────────────────────── */
  const handleAddFloor = async (e) => {
    e.preventDefault();
    if (!floorName.trim()) return alert("Please enter the floor name");
    try {
      await axios.post(`https://dr-backend-32ec.onrender.com/block/floor/${block?._id}`, {
        floor_name: floorName,
      });
      setFloorName("");
      const res = await axios.get(`https://dr-backend-32ec.onrender.com/block/get-data/${block?._id}`);
      setBlock(res.data);
    } catch {
      alert("Failed to add floor");
    }
  };

  const confirmDeleteFloor = () => {
    setDialogType("floor");
    sessionStorage.removeItem("selectedFloor");
    setShowDialog(true);
  };

  const confirmDeleteRoom = (room) => {
    setSelectedRoom(room);
    setDialogType("room");
    setShowDialog(true);
  };

  const handleConfirmDelete = async () => {
    setShowDialog(false);
    try {
      if (!block || !floorid) return;

      if (dialogType === "floor") {
        await axios.delete(`https://dr-backend-32ec.onrender.com/block/${block._id}/floor/${floorid._id}`);
        setFloorid(null);
      } else if (selectedRoom) {
        await axios.delete(
          `https://dr-backend-32ec.onrender.com/block/${block._id}/floor/${floorid._id}/room/${selectedRoom._id}`,
        );
      }

      const res = await axios.get(`https://dr-backend-32ec.onrender.com/block/get-data/${block._id}`);
      localStorage.setItem("block", JSON.stringify(res.data));
      setBlock(res.data);
      setRoomData(res.data.floors.find(f => f._id === floorid?._id)?.rooms || []);
      toast.success(dialogType === "floor" ? "Floor deleted" : `Room '${selectedRoom.room_name}' deleted`);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong");
    }
  };

  const displayRoom = (floor) => {
    sessionStorage.setItem("selectedFloor", JSON.stringify(floor));
    setFloorid(floor);
    setRoomData(floor.rooms);
  };

  const backToFloors = () => {
    sessionStorage.removeItem("selectedFloor");
    setFloorid(null);
    setRoomData([]);
    setRoomSearch("");
  };

  const addRooms = () => {
    if (block)
      navigate(`/aitam/${block.block_name}/${floorid.floor_name}`, {
        state: { floor: floorid, Block: block },
      });
  };

  const modifyRoom = (room) => {
    toast.info(`Redirecting to modify room: ${room.room_name}`);
    navigate(`/aitam/${block.block_name}/${floorid.floor_name}/modify/${room.room_name}`, {
      state: { Block: block, floor: floorid, Room: room },
    });
  };

  const backtohome = () => {
    navigate(`/`);
    sessionStorage.removeItem("selectedFloor");
  };

  const canEdit =
    access === "super_admin" ||
    (access !== "student" && dept.toLowerCase() === block?.block_name?.toLowerCase());

  /* ─────────────────────────────── JSX ───────────────────────────── */
  return (
    <Container fluid className="p-4 fs-6">
      <ToastContainer />
      {/* Confirm modal */}
      <Modal show={showDialog} onHide={() => setShowDialog(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete&nbsp;
          {dialogType === "floor"
            ? `Floor: "${floorid?.floor_name || ""}"`
            : `Room: "${selectedRoom?.room_name || ""}"`}
          ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Header card */}
      <Card className="mb-4 bg-light shadow-lg" style={{ fontSize: "1.2rem" }}>
        <Card.Body>
          <Card.Title className="text-center text-primary fw-bold fs-4">
            Floor Page for Block:&nbsp;
            <span style={{ color: "#333" }}>{block?.block_name}</span>
          </Card.Title>
          {err && <p className="text-danger text-center">{err}</p>}
        </Card.Body>
      </Card>

      {/* Back button */}
      <Row className="justify-content-end mb-3">
        <Col xs="auto">
          <Button variant="danger" onClick={backtohome} size="lg">
            Back to Home
          </Button>
        </Col>
      </Row>

      {loading ? (
        <Loader />
      ) : (
        /* ───────────────────────────── Floor list ─────────────────── */
        !floorid && (
          <>
            {canEdit && (
              <Row className="justify-content-center mb-4">
                <Col xs="auto">
                  <Form.Control
                    type="text"
                    placeholder="Enter floor name"
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    size="lg"
                  />
                </Col>
                <Col xs="auto">
                  <Button variant="primary" onClick={handleAddFloor} size="lg">
                    Add Floor
                  </Button>
                </Col>
              </Row>
            )}

            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
              {block?.floors?.map((floor, i) => (
                <Col key={i}>
                  <Card
                    className="text-center bg-info-subtle shadow-lg"
                    style={{ cursor: "pointer", fontSize: "0.9rem", padding: "0.5rem" }}
                    onClick={() => displayRoom(floor)}
                  >
                    <Card.Body>
                      <Card.Title className="fs-6">{floor.floor_name}</Card.Title>
                      <Card.Text className="fs-6">{floor.rooms.length} Rooms</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )
      )}

      {/* ───────────────────────────── Room list ───────────────────── */}
      {floorid && (
        <>
          <Row className="justify-content-center mb-3">
            <Col xs="auto">
              <Form.Control
                type="text"
                placeholder="Search Room"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                size="lg"
                style={{ width: "300px" }}
              />
            </Col>
          </Row>

          <Row className="mb-3 align-items-center">
            <Col>
              <h5 className="fw-bold">Rooms in Floor: {floorid.floor_name}</h5>
            </Col>
            <Col xs="auto">
              {canEdit && (
                <>
                  <Button variant="primary" className="me-2" size="lg" onClick={addRooms}>
                    Add Room
                  </Button>
                  <Button variant="danger" size="lg" onClick={confirmDeleteFloor}>
                    Delete Floor
                  </Button>
                </>
              )}
              <Button variant="outline-secondary" className="ms-2" size="lg" onClick={backToFloors}>
                Back to Floors
              </Button>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs="auto">
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="lg">
                <option value="all">All</option>
                <option value="occupied">Occupied</option>
                <option value="empty">Empty</option>
              </Form.Select>
            </Col>
          </Row>

          {roomdata.length ? (
            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
              {roomdata
                .filter(
                  (r) =>
                    (filterStatus === "all" ||
                      (filterStatus === "occupied" && r.occupied) ||
                      (filterStatus === "empty" && !r.occupied)) &&
                    (filterRoomType === "all" ||
                      r.room_type.toLowerCase().replace(/\s+/g, "") ===
                        filterRoomType.replace(/\s+/g, "")) &&
                    r.room_name.toLowerCase().includes(roomSearch.toLowerCase()),
                )
                .map((room, idx) => {
                  const timetable   = timetables[room.room_name];
                  const now         = new Date();
                  const hour        = now.getHours(); // 24‑hour ✔
                  const min         = now.getMinutes();
                  const periodinfo  = getCurrentPeriod(timetable, hour, min);
                  const cardColor   = room.occupied ? "#f8d7da" : "#d4edda";

                  return (
                    <Col key={idx}>
                      <Card
                        className="h-100 shadow-sm border-0"
                        style={{ backgroundColor: cardColor, fontSize: "0.85rem", padding: "0.5rem", minHeight: "280px" }}
                      >
                        <Card.Body className="d-flex flex-column justify-content-between">
                          <div>
                            <Card.Title className="fw-bold text-center text-dark mb-3">
                              {room.room_name}
                            </Card.Title>

                            {timetable ? (
                              periodinfo.status === "Ongoing" ? (
                                <Card.Text className="text-success text-center fw-semibold">
                                  {periodinfo.info}
                                </Card.Text>
                              ) : (
                                <Card.Text className="text-muted text-center">{periodinfo.status}</Card.Text>
                              )
                            ) : (
                              <>
                                <Card.Text><strong>ID:</strong> {room.room_id}</Card.Text>
                                <Card.Text><strong>Type:</strong> {room.room_type}</Card.Text>
                                <Card.Text><strong>Capacity:</strong> {room.room_capacity}</Card.Text>
                                <Card.Text><strong>Status:</strong> {room.occupied ? "Occupied" : "Empty"}</Card.Text>
                                <Card.Text>
                                  <strong>Last Modified:</strong>{" "}
                                  {formatDistanceToNow(new Date(room.lastModifiedDate), { addSuffix: true })}
                                </Card.Text>
                              </>
                            )}
                          </div>

                          {canEdit && (
                            <div className="mt-2">
                              {!timetable && (
                                <>
                                  <input type="file" onChange={handleFileUpload} className="form-control mb-2" />
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleUpload(room.room_name)}
                                    className="mb-2 w-100"
                                  >
                                    Upload
                                  </Button>
                                </>
                              )}

                              <Card.Footer className="d-flex justify-content-between p-1 bg-transparent border-0">
                                {!timetable ? (
                                  <>
                                    <Button size="sm" variant="info" onClick={() => modifyRoom(room)}>
                                      Modify
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => confirmDeleteRoom(room)}>
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => deleteTimetableByClass(room.room_name)}
                                    >
                                      Remove Timetable
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => confirmDeleteRoom(room)}>
                                      Delete Room
                                    </Button>
                                  </>
                                )}
                              </Card.Footer>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
            </Row>
          ) : (
            <p className="text-center mt-4">No rooms found.</p>
          )}
        </>
      )}
    </Container>
  );
};

export default Floorpage;
