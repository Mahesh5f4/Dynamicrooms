import React, { useEffect, useState,useRef } from 'react';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Homepage.css";
import {jwtDecode} from "jwt-decode";

const Homepage = () => {
  const [block, setBlock] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  
  const [access,setaccess] = useState("");
  const [dept,setdept] = useState("");
  const [isrefresh,setisrefresh] = useState(false)

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  //shortcut keys..
  useEffect(()=>{
    const shortcutKeys = (e)=>{
      if( e.altKey && (e.key=="s" || e.key=="S")){
        e.preventDefault()
        navigate("/login")
      }
      if(e.ctrlKey && e.key=="r"){
        e.preventDefault()
        navigate("/register")
      }
    }

    window.addEventListener("keydown",shortcutKeys);
    return(()=>{
      window.removeEventListener("keydown",shortcutKeys)
    })
  },[])

  //when entering into another block, floor details should be removed from the session....
  useEffect(()=>{
    sessionStorage.removeItem("floorid")
  },[])

  useEffect(() => {
    const handleBackButton = (event) => {
      event.preventDefault();
      navigate("/"); 
    };

    const token=sessionStorage.getItem("token");
    const decode=jwtDecode(token);
      // console.log(decode.role == "student")
      setaccess(decode.role);
      setdept(decode.dept);
     
    const fetchDetails = async () => {
      try {
        const details = await axios.get("https://dr-backend-32ec.onrender.com/block/get-data");
        setBlock(details.data);
        const allRooms = details.data.flatMap(block => 
          block.floors.flatMap(floor => floor.rooms)
        );
        
        setFilteredRooms(allRooms);
        
      } catch (err) {
        setErr(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();

    window.history.pushState(null, null, window.location.href);
  window.addEventListener("popstate", handleBackButton);

  return () => {
    window.removeEventListener("popstate", handleBackButton);
  };
  }, [isrefresh]);


  useEffect(() => {
  const handleClickOutside = (event) => {
    // console.log("Clicked element:", event.target);  // Debugging
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      // console.log("Closing menu...");  // Check if this prints
      setShowMenu(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);


  if (loading) {
    return (
      <div className="loading-con">
        <div className="loading"></div>
      </div>
    );
  }

  if (err) {
    return <div className="error">Error occurred: {err}</div>;
  }

  const modifyBlock = async(e)=>{
    try{
      const block_name = prompt("Enter new block name");
    const response = await axios.put(`https://dr-backend-32ec.onrender.com//update-data/${e._id}`,{
      "new_block":block_name
    })
    alert(`Block modified succesfully to ${block_name}`)
    setisrefresh(!isrefresh);
    }catch(err){
      console.log(err.message)
      alert(err.message)
    }
  }

  
  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const allRooms = block.flatMap(block =>
      block.floors.flatMap(floor => 
        floor.rooms.map(room => ({
          ...room, 
          block_name: block.block_name 
        }))
      )
    );
  
    if (term === "") {
      setFilteredRooms(allRooms); // Reset to all rooms when input is empty
    } else {
      setFilteredRooms(allRooms.filter(room =>
        room.room_name.toLowerCase().includes(term) ||
        room.room_type.toLowerCase().includes(term)
      ));
    }
  };

  const deleteBlock = async (e) => {
    try {
      const isConfirmed = window.confirm(`Are you sure you want to delete ${e.block_name}?`);
      
      if (!isConfirmed) {
        return; 
      }
      
      const response = await axios.delete(`https://dr-backend-32ec.onrender.com/block/delete-data/${e._id}`);
      alert(`${e.block_name} has been deleted successfully`);
      
      const details = await axios.get("https://dr-backend-32ec.onrender.com/block/get-data");
      setBlock(details.data);
    } catch (err) {
      alert("Something went wrong while deleting the block.");
    }
  };
  
  const handleSignOut = () => {
    sessionStorage.clear(); 
    navigate("/login"); 
  };
  
  const handleRegisterUser=()=>{
    navigate("/register");
  }
  
  const dashboardHandler=()=>{
    navigate("/dashboard");
  }

  const roomsOverview=()=>{
    navigate("/roomsOverview")
  }

  return(
    <>
      <div className="container mt-3">
  <nav className="navbar navbar-light bg-light px-3 d-flex align-items-center mb-3 position-relative" style={{ zIndex: 20 }}>
    {/* Hamburger Menu */}
    <div className="position-relative" ref={menuRef}>
      <button
        className="btn btn-outline-primary"
        onClick={() => setShowMenu(!showMenu)}
      >
        ☰
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <ul className="dropdown-menu show position-absolute start-0 mt-2">
          {access == "super_admin" && (
            <li>
              <button className="dropdown-item text-primary" onClick={() => navigate("/add-block")}>
                Add Block
              </button>
            </li>
          )}
          {access != "student" && (
            <li>
              <button className="dropdown-item text-success" onClick={handleRegisterUser}>
                Register
              </button>
            </li>
          )}
          {access == "super_admin" && (
            <li>
              <button className="dropdown-item text-primary" onClick={dashboardHandler}>
                Dashboard
              </button>
            </li>
          )}
          <li>
            <button className="dropdown-item text-warning" onClick={roomsOverview}>
              Rooms Overview
            </button>
          </li>

          <li>
            <button className="dropdown-item text-danger" onClick={handleSignOut}>
              Sign Out
            </button>
          </li>
        </ul>
      )}
    </div>

    {/* Title in the center */}
    <h3 className="m-0 flex-grow-1 text-center">Dynamic Rooms</h3>

    {/* Search Bar */}
    <div className="d-flex align-items-center">
      <input
        type="search"
        className="form-control me-2"
        placeholder="Search..."
        onChange={(e) => handleSearch(e)}
      />
    </div>
  </nav>

  {/* Main Content */}
  <div>
    {/* Room Details Section (Shown when Searching) */}
    {/* {searchTerm !== "" && (
      <div className="room-overlay position-absolute w-100 h-100 d-flex flex-wrap justify-content-center align-items-start overflow-auto p-3"style={{ backgroundColor: "rgba(255, 255, 255, 0.95)", top: 0, left: 0, zIndex: 10 }}>
        {filteredRooms.length ? (
          filteredRooms.map((room, index) => (
            <div className="room-card card p-2 shadow-sm m-2 d-flex flex-column align-items-center" key={index} style={{ width: "250px" }}>
              <h5 className="text-primary">{room.block_name.toUpperCase()}</h5>
              <h6>{room.room_name.toUpperCase()}</h6>
              <p className="small">Type: {room.room_type}</p>
              <p className="small">Capacity: {room.room_capacity}</p>
              <p className={room.occupied ? "text-danger fw-bold" : "text-success fw-bold"}>
                {room.occupied ? "Occupied" : "Available"}
              </p>
            </div>
          ))
        ) : (
          <h3 className="text-center text-muted">NO Matching Rooms...</h3>
        )}
      </div>
    )} */}

    {searchTerm !== "" && (
      <div
      className="room-overlay"
      style={{
        position: "fixed",
        top: "80px", // leave space for navbar
        left: 0,
        width: "100vw",
        height: "calc(100vh - 80px)", // adjust height accordingly
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        zIndex: 9999,
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
    
      {filteredRooms.length ? (
          filteredRooms.map((room, index) => (
            <div className="room-card card p-2 shadow-sm m-2 d-flex flex-column align-items-center" key={index} style={{ width: "250px" }}>
              <h5 className="text-primary">{room.block_name.toUpperCase()}</h5>
              <h6>{room.room_name.toUpperCase()}</h6>
              <p className="small">Type: {room.room_type}</p>
              <p className="small">Capacity: {room.room_capacity}</p>
              <p className={room.occupied ? "text-danger fw-bold" : "text-success fw-bold"}>
                {room.occupied ? "Occupied" : "Available"}
              </p>
            </div>
          ))
        ) : (
          <h3 className="text-center text-muted">NO Matching Rooms...</h3>
        )}
      </div>
    )}


{!block.length ? (
          <h1 className="text-center text-muted mt-4">No data found...</h1>
        ) : (
          <div className={`row g-2 ${searchTerm !== "" ? "blur-content" : ""}`}>
            {block.map((e, index) => (
              <div key={index} className="col-md-3">
                <div className="card shadow-sm border-0 p-2">
                  <div
                    className="card-content text-center"
                    onClick={() => navigate(`/get-data/${e.block_name}`, { state: { block: e } })}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="img bg-light mb-1 rounded" style={{ height: "80px" }}></div>
                    <h5 className="text-primary">{e.block_name.toUpperCase()}</h5>
                    <p className="small text-muted">No of Floors: {e.floors.length}</p>
                  </div>

                  {
                    (access === "super_admin" || e.block_name.toLowerCase() == dept) && (
                      <div
                    className={`d-flex justify-content-between card-button
                    `}>
                      <button className="btn btn-primary btn-sm" onClick={() => modifyBlock(e)}>
                        Modify
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteBlock(e)}>
                        Delete
                      </button>
                  </div>
                    )
                  }
                  
                </div>
              </div>
            ))}
          </div>
        )}
  </div>
</div>
    </>
  )

}
export default Homepage;




// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { jwtDecode } from "jwt-decode";
// import { 
//   Button, 
//   TextField, 
//   Card, 
//   CardContent, 
//   Typography, 
//   Container, 
//   Grid, 
//   Box 
// } from "@mui/material";
// import DeleteIcon from "@mui/icons-material/Delete";
// import EditIcon from "@mui/icons-material/Edit";
// import "./Homepage.css"; 

// const Homepage = () => {
//   const [block, setBlock] = useState([]);
//   const [err, setErr] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const navigate = useNavigate();
//   const [access, setAccess] = useState("");

//   useEffect(() => {
//     const token = sessionStorage.getItem("token");
//     if (token) {
//       const decode = jwtDecode(token);
//       setAccess(decode.role);
//     }

//     const fetchDetails = async () => {
//       try {
//         const details = await axios.get("http://localhost:5000/block/get-data");
//         setBlock(details.data);
//       } catch (err) {
//         setErr(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchDetails();
//   }, []);

//   if (loading) return <div className="loading">Loading...</div>;
//   if (err) return <div className="error">Error: {err}</div>;

//   const handleDelete = async (blockName) => {
//     const confirmDelete = window.confirm(`Are you sure you want to delete ${blockName}?`);
//     if (!confirmDelete) return;

//     try {
//       await axios.delete(`http://localhost:5000/block/delete/${blockName}`);
//       setBlock(block.filter(b => b.block_name !== blockName));
//       alert(`${blockName} deleted successfully!`);
//     } catch (error) {
//       alert("Error deleting block: " + error.message);
//     }
//   };

//   const handleSearch = (event) => {
//     setSearchTerm(event.target.value.toLowerCase());
//   };

//   const filteredBlocks = block.filter(b => 
//     b.block_name.toLowerCase().includes(searchTerm)
//   );

//   return (
//     <Container maxWidth="lg" className="homepage-container">
//       <Box className="header-actions">
//         {access === "super_admin" && (
//           <Button variant="contained" color="primary" onClick={() => navigate("/add-block")}>
//             Add Block
//           </Button>
//         )}
//         <TextField 
//           variant="outlined"
//           label="Search Rooms"
//           onChange={handleSearch}
//           className="search-bar"
//         />
//         <Button 
//           variant="contained"
//           color="error"
//           onClick={() => {
//             sessionStorage.clear();
//             navigate("/login");
//           }}
//         >
//           Sign Out
//         </Button>
//         <Button variant="contained" color="success" onClick={() => navigate("/dashboard")}>
//           Dashboard
//         </Button>
//       </Box>

//       <Typography variant="h3" className="page-title">Home Page</Typography>

//       <Grid 
//         container 
//         spacing={3} 
//         justifyContent="center" 
//         className={`card-container ${searchTerm ? "search-active" : ""}`}
//       >
//         {filteredBlocks.length > 0 ? (
//           filteredBlocks.map((e, index) => (
//             <Grid 
//               item 
//               xs={12} sm={6} md={4} 
//               key={index} 
//               className="block-card highlighted"
//             >
//               <Card>
//                 <CardContent onClick={() => navigate(`/get-data/${e.block_name}`, { state: { block: e } })}>
//                   <Typography variant="h5">{e.block_name.toUpperCase()}</Typography>
//                   <Typography>No of Floors: {e.floors.length}</Typography>
//                 </CardContent>
//                 {(access === "super_admin" || access === "admin") && (
//                   <Box className="card-actions">
//                     <Button 
//                       variant="contained" 
//                       color="warning" 
//                       startIcon={<EditIcon />} 
//                       onClick={() => navigate(`/modify-block/${e.block_name}`)}
//                     >
//                       Modify
//                     </Button>
//                     <Button 
//                       variant="contained" 
//                       color="error" 
//                       startIcon={<DeleteIcon />} 
//                       onClick={() => handleDelete(e.block_name)}
//                     >
//                       Delete
//                     </Button>
//                   </Box>
//                 )}
//               </Card>
//             </Grid>
//           ))
//         ) : (
//           <Typography variant="h6" className="no-results">No results found</Typography>
//         )}
//       </Grid>
//     </Container>
//   );
// };

// export default Homepage;
