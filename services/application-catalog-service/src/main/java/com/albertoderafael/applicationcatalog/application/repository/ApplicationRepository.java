package com.albertoderafael.applicationcatalog.application.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.albertoderafael.applicationcatalog.application.entity.Application;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    Page<Application> findByStatus(
            String status,
            Pageable pageable);

    Page<Application> findByCriticality(
            String criticality,
            Pageable pageable);

    Page<Application> findByStatusAndCriticality(
            String status,
            String criticality,
            Pageable pageable);

}
