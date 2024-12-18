
import * as Carousel from "./Carousel.js";
import axios from "axios";


const breedSelect = document.getElementById("breedSelect");

const infoDump = document.getElementById("infoDump");

const progressBar = document.getElementById("progressBar");

const getFavouritesBtn = document.getElementById("getFavouritesBtn");


const API_KEY = "live_1hHovBhqydVK15CKqCwNc2lgYVUK1l4jkM2FojHe9hgbbTY1n0v1cgx0JUGYr7kH"; 


axios.defaults.baseURL = "https://api.thecatapi.com/v1/";
axios.defaults.headers.common["x-api-key"] = API_KEY;


axios.interceptors.request.use(
  (config) => {
    console.log("Request started at:", new Date());
    config.metadata = { startTime: new Date() };

  
    document.body.style.cursor = "progress";

    // Turn back the progress bar to 0%
    progressBar.style.width = "0%";

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    const time = new Date() - response.config.metadata.startTime;
    console.log("Request ended at:", new Date());
    console.log(`Request took ${time} ms`);

    // Reset the cursor
    document.body.style.cursor = "default";

   
    progressBar.style.width = "100%";
    setTimeout(() => {
      progressBar.style.width = "0%";
    }, 500);

    return response;
  },
  (error) => {
    // Reset cursor just in case of an error
    document.body.style.cursor = "default";
    return Promise.reject(error);
  }
);


function updateProgress(event) {
  if (event.lengthComputable) {
    const percentCompleted = Math.round((event.loaded * 100) / event.total);
    progressBar.style.width = percentCompleted + "%";
  } else {
    
    progressBar.style.width = "100%";
  }
}


async function initialLoad() {
  try {
    const response = await axios.get("breeds");
    const breeds = response.data;

    console.log("Retrieved breeds:", breeds);

    breeds.forEach((breed) => {
      if (breed.id && breed.name) {
        const option = document.createElement("option");
        option.value = breed.id;
        option.textContent = breed.name;
        breedSelect.appendChild(option);
      }
    });

    // Set default selected breed
    if (breeds.length > 0) {
      breedSelect.value = breeds[0].id;
    }

    // Load initial images
    await loadBreedImages();
  } catch (error) {
    const errorMsg = error.response
      ? `Error: ${error.response.status} ${error.response.statusText}`
      : error.message;
    console.error("Error fetching breeds:", error.response || error.message);
    infoDump.innerHTML = `<p>${errorMsg}</p>`;
  }
}


initialLoad();


async function loadBreedImages() {
  const selectedBreedId = breedSelect.value;

  console.log("Selected Breed ID:", selectedBreedId);

  try {
    const response = await axios.get("images/search", {
      params: {
        breed_ids: selectedBreedId,
        limit: 10,
        include_breeds: true,
      },
      onDownloadProgress: updateProgress,
    });
    const images = response.data;

    console.log("Fetched Images:", images);

    // Clear the exissting carousel items and info section
    Carousel.clear();
    infoDump.innerHTML = "";

    
    if (images.length === 0) {
      infoDump.innerHTML = "<p>No images found for this breed.</p>";
      Carousel.start(); 
      return;
    }

    
    let breedInfo = null;
    if (images[0] && images[0].breeds && images[0].breeds.length > 0) {
      breedInfo = images[0].breeds[0];
    } else {
      
      const breedResponse = await axios.get(`breeds/${selectedBreedId}`);
      breedInfo = breedResponse.data;
    }

    
    if (breedInfo) {
      const infoSection = document.createElement("div");
      infoSection.classList.add("breed-info");
      infoSection.innerHTML = `
        <h2>${breedInfo.name}</h2>
        <p>${breedInfo.description || "Description not available."}</p>
        <p><strong>Temperament:</strong> ${breedInfo.temperament || "N/A"}</p>
        <p><strong>Life Span:</strong> ${breedInfo.life_span || "N/A"} years</p>
        <p><strong>Origin:</strong> ${breedInfo.origin || "N/A"}</p>
        ${
          breedInfo.wikipedia_url
            ? `<p><a href="${breedInfo.wikipedia_url}" target="_blank">Learn more on Wikipedia</a></p>`
            : ""
        }
      `;
      infoDump.appendChild(infoSection);
    } else {
      infoDump.innerHTML = "<p>Breed information not available.</p>";
    }

    
    images.forEach((image) => {
      let breedName = "Cat Image";
      if (image.breeds && image.breeds.length > 0) {
        breedName = image.breeds[0].name;
      }
      const carouselItem = Carousel.createCarouselItem(
        image.url,
        breedName,
        image.id
      );
      Carousel.appendCarousel(carouselItem);
    });

    
    Carousel.start();
  } catch (error) {
    const errorMsg = error.response
      ? `Error: ${error.response.status} ${error.response.statusText}`
      : error.message;
    console.error("Error fetching images:", error.response || error.message);
    infoDump.innerHTML = `<p>${errorMsg}</p>`;
  }
}


breedSelect.addEventListener("change", loadBreedImages);


export async function favourite(imgId) {
  try {
    
    const favResponse = await axios.get("favourites");
    const favourites = favResponse.data;

    const existingFav = favourites.find((fav) => fav.image_id === imgId);

    if (existingFav) {
      
      await axios.delete(`favourites/${existingFav.id}`);
      alert("Removed from favourites");
    } else {
      
      await axios.post("favourites", {
        image_id: imgId,
      });
      alert("Added to favourites");
    }
  } catch (error) {
    const errorMsg = error.response
      ? `Error: ${error.response.status} ${error.response.statusText}`
      : error.message;
    console.error("Error toggling favourite:", error.response || error.message);
    alert(`Error: ${errorMsg}`);
  }
}


getFavouritesBtn.addEventListener("click", async () => {
  try {
    const response = await axios.get("favourites");

    const favourites = response.data;

    if (favourites.length === 0) {
      infoDump.innerHTML = "<p>You have no favourite images.</p>";
      Carousel.clear();
      Carousel.start();
      return;
    }

    
    const images = favourites.map((fav) => ({
      id: fav.image.id,
      url: fav.image.url,
    }));

    
    Carousel.clear();
    infoDump.innerHTML = "<h2>Your Favourites</h2>";

    images.forEach((image) => {
      const carouselItem = Carousel.createCarouselItem(
        image.url,
        "Favourite Cat Image",
        image.id
      );
      Carousel.appendCarousel(carouselItem);
    });

    // This is to restart the carousel
    Carousel.start();
  } catch (error) {
    const errorMsg = error.response
      ? `Error: ${error.response.status} ${error.response.statusText}`
      : error.message;
    console.error("Error fetching favourites:", error.response || error.message);
    infoDump.innerHTML = `<p>${errorMsg}</p>`;
  }
});
