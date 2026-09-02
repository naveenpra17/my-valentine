package com.loveuniverse.controller;

import com.loveuniverse.dto.PhotoDto;
import com.loveuniverse.service.PhotoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping
    public List<PhotoDto> getAll() {
        return photoService.findAllActiveForDefaultSite();
    }
}
